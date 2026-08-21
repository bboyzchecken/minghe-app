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
	return c.JSON(http.StatusOK, request.ListResponse{Data: orders, Pagination: pagination})
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
		"order":  order,
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
