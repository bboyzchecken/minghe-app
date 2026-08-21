package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
)

func (s *Server) AdminListUsers(c echo.Context) error {
	query := models.ListUserQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		Search:          c.QueryParam("search"),
		Role:            c.QueryParam("role"),
		Status:          c.QueryParam("status"),
	}

	users, pagination, err := s.UserStore.List(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list users"))
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: users, Pagination: pagination})
}

type updateUserStatusBody struct {
	Status string `json:"status" validate:"required,oneof=active deactivated"`
}

func (s *Server) AdminUpdateUserStatus(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}

	var body updateUserStatusBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	user, err := s.UserStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}

	user.Status = body.Status
	if err := s.UserStore.Update(user); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update user"))
	}
	return c.JSON(http.StatusOK, user)
}

// adminOrderRow = orderResponse + ข้อมูลที่หน้า admin ต้องเห็นเพิ่ม (อีเมลลูกค้า)
type adminOrderRow struct {
	orderResponse
	CustomerEmail string `json:"customer_email"`
}

func (s *Server) AdminListOrders(c echo.Context) error {
	query := models.ListOrderQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		Product:         c.QueryParam("product"),
		Status:          c.QueryParam("status"),
		Search:          c.QueryParam("search"),
	}

	orders, pagination, err := s.OrderStore.List(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list orders"))
	}

	// เติมอีเมลลูกค้า — ดึงผู้ใช้เป็นชุดเดียว ไม่ยิงทีละแถว
	emails := map[uint]string{}
	for _, o := range orders {
		if o.UserID == nil {
			continue
		}
		if _, seen := emails[*o.UserID]; seen {
			continue
		}
		if u, findErr := s.UserStore.Find(int(*o.UserID)); findErr == nil {
			emails[*o.UserID] = u.Email
		}
	}

	rows := make([]adminOrderRow, 0, len(orders))
	for _, o := range orders {
		row := adminOrderRow{orderResponse: toOrderResponse(o)}
		if o.UserID != nil {
			row.CustomerEmail = emails[*o.UserID]
		}
		rows = append(rows, row)
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: rows, Pagination: pagination})
}

/* ── ภาพรวม + การรับเรื่อง (multi-admin) ─────────────────── */

// AdminOverview ตัวเลขสรุปสำหรับหน้าแรกของ Admin Console
func (s *Server) AdminOverview(c echo.Context) error {
	orderCounts, err := s.OrderStore.CountByStatus()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot count orders"))
	}

	_, allUsers, err := s.UserStore.List(models.ListUserQuery{})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot count users"))
	}
	_, activeUsers, err := s.UserStore.List(models.ListUserQuery{Status: models.StatusActive})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot count users"))
	}

	docs, err := s.ConsentStore.ListDocuments("th")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list documents"))
	}
	published := 0
	for _, d := range docs {
		if d.Status == models.DocPublished {
			published++
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"orders":          orderCounts,
		"users_total":     allUsers.Total,
		"users_active":    activeUsers.Total,
		"legal_published": published,
		"legal_total":     4,
	})
}

// currentAdmin คืนบัญชีของแอดมินที่กำลังเรียก endpoint นี้
func (s *Server) currentAdmin(c echo.Context) (*models.User, error) {
	return s.UserStore.Find(int(CurrentUserID(c)))
}

// AdminClaimOrder "รับเรื่อง" — จองคำสั่งซื้อไว้กับตัวเอง
// ถ้ามีแอดมินคนอื่นถืออยู่แล้วจะได้ 409 พร้อมชื่อ เพื่อไม่ให้ทำงานซ้อนกัน
func (s *Server) AdminClaimOrder(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	order, err := s.OrderStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("order not found"))
	}

	me, err := s.currentAdmin(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
	}

	if order.AssignedAdminID != nil && *order.AssignedAdminID != me.ID {
		return c.JSON(http.StatusConflict,
			request.Err("งานนี้อยู่กับ "+order.AssignedAdminName+" แล้ว"))
	}

	order.AssignedAdminID = &me.ID
	order.AssignedAdminName = me.Name
	if err := s.OrderStore.Update(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot claim order"))
	}
	return c.JSON(http.StatusOK, toOrderResponse(order))
}

// AdminReleaseOrder คืนงานเข้าคิวกลาง
// ตั้งใจให้แอดมินคนไหนก็คืนได้ (ไม่จำกัดเฉพาะผู้ถือ) — รองรับกรณีคนถืองานไม่อยู่
func (s *Server) AdminReleaseOrder(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	order, err := s.OrderStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("order not found"))
	}

	order.AssignedAdminID = nil
	order.AssignedAdminName = ""
	if err := s.OrderStore.Update(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot release order"))
	}
	return c.JSON(http.StatusOK, toOrderResponse(order))
}

// AdminDeliverOrder ปิดงาน: processing → delivered และเผยแพร่รายงานฉบับล่าสุดถ้ามี
func (s *Server) AdminDeliverOrder(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	order, err := s.OrderStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("order not found"))
	}
	if order.Status != models.OrderProcessing {
		return c.JSON(http.StatusConflict, request.Err("ส่งมอบได้เฉพาะงานที่กำลังดำเนินการ"))
	}

	me, err := s.currentAdmin(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
	}
	if order.AssignedAdminID != nil && *order.AssignedAdminID != me.ID {
		return c.JSON(http.StatusConflict,
			request.Err("งานนี้อยู่กับ "+order.AssignedAdminName+" แล้ว — ให้เจ้าของงานเป็นผู้ส่งมอบ"))
	}

	now := time.Now()
	order.Status = models.OrderDelivered
	order.DeliveredAt = &now
	if err := s.OrderStore.Update(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update order"))
	}

	// เผยแพร่รายงานล่าสุดของออเดอร์นี้ พร้อมบันทึกว่าใครตรวจ
	if report, findErr := s.ReportStore.FindLatestByOrder(order.ID); findErr == nil {
		report.Status = models.ReportPublished
		report.ReviewedBy = me.Name
		report.ReviewedAt = &now
		if err := s.ReportStore.Update(report); err != nil {
			logger.Warn("cannot publish report: ", err)
		}
	}

	return c.JSON(http.StatusOK, toOrderResponse(order))
}

// AdminProcessOrder เปลี่ยนสถานะเป็น processing และสร้างรายงานฉบับร่างรอซินแสตรวจ
//
// ตอนนี้ยังไม่เรียก engine จริง — ส่วนคำนวณอยู่ใน packages/core (TypeScript)
// การเชื่อมสองฝั่งนี้เข้าด้วยกันยังไม่ได้ตัดสินใจ (ดู Q0-1 ใน docs/uat-2026-08-01-feedback-plan.md)
func (s *Server) AdminProcessOrder(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}

	order, err := s.OrderStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("order not found"))
	}
	if order.Status != models.OrderPaid {
		return c.JSON(http.StatusConflict, request.Err("คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน"))
	}

	// วินัยการทำงานหลายแอดมิน: งานของคนอื่นห้ามแตะ / งานว่างถือว่ารับเรื่องอัตโนมัติ
	me, err := s.currentAdmin(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
	}
	if order.AssignedAdminID != nil && *order.AssignedAdminID != me.ID {
		return c.JSON(http.StatusConflict,
			request.Err("งานนี้อยู่กับ "+order.AssignedAdminName+" แล้ว"))
	}

	order.AssignedAdminID = &me.ID
	order.AssignedAdminName = me.Name
	order.Status = models.OrderProcessing
	if err := s.OrderStore.Update(order); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update order"))
	}

	report := &models.Report{
		OrderID: order.ID,
		Version: 1,
		Status:  models.ReportDraft,
	}
	if err := s.ReportStore.Create(report); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot create report"))
	}

	return c.JSON(http.StatusAccepted, map[string]any{
		"order":  toOrderResponse(order),
		"report": report,
	})
}

func (s *Server) AdminListLegalDocuments(c echo.Context) error {
	docs, err := s.ConsentStore.ListDocuments(c.QueryParam("locale"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list documents"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": docs})
}

type upsertLegalBody struct {
	Slug      string `json:"slug" validate:"required,oneof=terms privacy refund cookies"`
	Version   string `json:"version" validate:"required"`
	Locale    string `json:"locale" validate:"omitempty,oneof=th en"`
	Title     string `json:"title" validate:"required"`
	ContentMD string `json:"content_md" validate:"required"`
	Publish   bool   `json:"publish"`
}

// AdminUpsertLegalDocument สร้างหรือแก้เอกสารกฎหมายรายเวอร์ชัน (F-01)
//
// การ publish ต้องเป็นการกระทำที่ตั้งใจเสมอ (ต้องส่ง publish: true)
// เพื่อไม่ให้ร่างที่ยังไม่ผ่านการตรวจหลุดขึ้นหน้าเว็บ
func (s *Server) AdminUpsertLegalDocument(c echo.Context) error {
	var body upsertLegalBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	status := models.DocDraft
	var effectiveAt *time.Time
	if body.Publish {
		now := time.Now()
		status = models.DocPublished
		effectiveAt = &now
	}

	doc := &models.LegalDocument{
		Slug:        body.Slug,
		Version:     body.Version,
		Locale:      orDefault(body.Locale, "th"),
		Title:       body.Title,
		ContentMD:   body.ContentMD,
		EffectiveAt: effectiveAt,
		Status:      status,
	}
	if err := s.ConsentStore.UpsertDocument(doc); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot save document"))
	}

	logger.Info("legal document saved: ", doc.Slug, " v", doc.Version, " status=", doc.Status)
	return c.JSON(http.StatusOK, doc)
}
