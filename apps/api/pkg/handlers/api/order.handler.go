package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
)

/* ── คำสั่งซื้อ ─────────────────────────────────────────── */

type createOrderBody struct {
	Product          string `json:"product" validate:"required,oneof=employer jobseeker"`
	Depth            string `json:"depth" validate:"omitempty,oneof=standard premium executive"`
	Speed            string `json:"speed" validate:"omitempty,oneof=standard express"`
	SubjectProfileID *uint  `json:"subject_profile_id" validate:"required"`
	OrganizationID   *uint  `json:"organization_id"`
	TeamID           *uint  `json:"team_id"`
	OrgMode          string `json:"org_mode" validate:"omitempty,oneof=executive company-date industry"`
	Input            any    `json:"input"` // snapshot ของฟอร์ม เก็บไว้ตรวจย้อนหลัง
}

func (s *Server) ListOrders(c echo.Context) error {
	userID := CurrentUserID(c)
	query := models.ListOrderQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		UserID:          &userID,
		Product:         c.QueryParam("product"),
		Status:          c.QueryParam("status"),
	}

	// ฝั่งองค์กรดูรายการของทั้งองค์กร ไม่ใช่เฉพาะที่ตัวเองสั่ง
	if raw := c.QueryParam("organization_id"); raw != "" {
		orgID, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return c.JSON(http.StatusBadRequest, request.Err("invalid organization_id"))
		}
		if !s.canAccessOrganization(c, uint(orgID)) {
			return c.JSON(http.StatusForbidden, request.Err("forbidden"))
		}
		id := uint(orgID)
		query.OrganizationID = &id
		query.UserID = nil
	}

	orders, pagination, err := s.OrderStore.List(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list orders"))
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: orders, Pagination: pagination})
}

// CreateOrder สร้างคำสั่งซื้อในสถานะ draft
// ราคายังคำนวณที่ฝั่ง server เสมอ — ไม่รับตัวเลขราคาจาก client
func (s *Server) CreateOrder(c echo.Context) error {
	var body createOrderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	profile, err := s.ProfileStore.Find(int(*body.SubjectProfileID))
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("subject profile not found"))
	}
	if profile.OrganizationID != nil && !s.canAccessOrganization(c, *profile.OrganizationID) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}
	if body.OrganizationID != nil && !s.canAccessOrganization(c, *body.OrganizationID) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}

	code, err := request.GenerateAccessCode()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot generate access code"))
	}

	// เก็บเป็น NULL เมื่อไม่มี snapshot — คอลัมน์ชนิด JSON ของ MySQL ไม่รับสตริงว่าง
	var inputJSON *string
	if body.Input != nil {
		if raw, marshalErr := json.Marshal(body.Input); marshalErr == nil {
			encoded := string(raw)
			inputJSON = &encoded
		}
	}

	userID := CurrentUserID(c)
	depth := orDefault(body.Depth, "premium")
	speed := orDefault(body.Speed, models.SpeedStandard)

	order := &models.Order{
		Code:             code,
		UserID:           &userID,
		OrganizationID:   body.OrganizationID,
		Product:          body.Product,
		Depth:            depth,
		Speed:            speed,
		SubjectProfileID: body.SubjectProfileID,
		TeamID:           body.TeamID,
		OrgMode:          body.OrgMode,
		InputJSON:        inputJSON,
		AmountSatang:     priceSatang(body.Product, depth, speed),
		Currency:         "THB",
		Status:           models.OrderDraft,
	}

	if err := s.OrderStore.Create(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot create order"))
	}
	return c.JSON(http.StatusCreated, order)
}

func (s *Server) GetOrder(c echo.Context) error {
	order, err := s.loadOwnedOrder(c)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, order)
}

type payOrderBody struct {
	ConsentID  uint   `json:"consent_id" validate:"required"`
	PaymentRef string `json:"payment_ref"`
	Method     string `json:"method"`
}

// PayOrder ยืนยันการชำระเงิน
//
// บังคับให้ต้องมี consent_id ก่อนเสมอ (F-06) — กล่องยินยอมฝั่ง UI เป็นแค่ชั้นแรก
// ชั้นที่ผูกพันจริงคือเรคคอร์ด Consent ที่ผูกกับคำสั่งซื้อใบนี้
//
// TODO(Q0-3): เมื่อสรุปผู้ให้บริการชำระเงินแล้ว ให้ย้ายการยืนยันไปที่ webhook
// ไม่ใช่เชื่อผลจาก client แบบที่ทำอยู่ตอนนี้
func (s *Server) PayOrder(c echo.Context) error {
	order, err := s.loadOwnedOrder(c)
	if err != nil {
		return err
	}
	if order.Status != models.OrderDraft && order.Status != models.OrderAwaitingPayment {
		return c.JSON(http.StatusConflict, request.Err("คำสั่งซื้อนี้ชำระเงินไปแล้วหรือถูกยกเลิก"))
	}

	var body payOrderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	consent, findErr := s.ConsentStore.Find(int(body.ConsentID))
	if findErr != nil {
		return c.JSON(http.StatusUnprocessableEntity,
			request.Err("ต้องยอมรับเงื่อนไขการใช้งาน นโยบายความเป็นส่วนตัว และนโยบายการคืนเงินก่อนชำระเงิน"))
	}
	if consent.UserID != nil && *consent.UserID != CurrentUserID(c) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}

	if err := s.ConsentStore.AttachOrder(consent.ID, order.ID); err != nil {
		logger.Warn("cannot attach consent to order: ", err)
	}

	now := time.Now()
	order.ConsentID = &consent.ID
	order.PaymentRef = body.PaymentRef
	order.PaymentMethod = body.Method
	order.Status = models.OrderPaid
	order.PaidAt = &now

	if err := s.OrderStore.Update(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update order"))
	}
	return c.JSON(http.StatusOK, order)
}

/* ── ราคา ───────────────────────────────────────────────── */

// priceSatang คำนวณราคาจากตารางราคาที่ตรึงไว้ฝั่ง server
// ตัวเลขตรงกับที่แสดงบนหน้าเว็บสาธิต — ถ้าเปลี่ยนราคา ต้องแก้ทั้งสองที่ให้ตรงกัน
func priceSatang(product, depth, speed string) int {
	baht := 0

	switch product {
	case models.ProductJobSeeker:
		baht = 199
	default: // employer
		switch depth {
		case "standard":
			baht = 199
		case "executive":
			baht = 599
		default: // premium
			baht = 299
		}
	}

	if speed == models.SpeedExpress {
		baht += 99
	}
	return baht * 100
}

func (s *Server) loadOwnedOrder(c echo.Context) (*models.Order, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return nil, c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	order, err := s.OrderStore.Find(id)
	if err != nil {
		return nil, c.JSON(http.StatusNotFound, request.Err("order not found"))
	}

	if order.OrganizationID != nil {
		if !s.canAccessOrganization(c, *order.OrganizationID) {
			return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
		}
		return order, nil
	}
	if order.UserID == nil || *order.UserID != CurrentUserID(c) {
		return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}
	return order, nil
}
