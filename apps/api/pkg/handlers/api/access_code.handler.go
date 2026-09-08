package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store/billing"
)

/*
รหัสเข้าใช้รอบ UAT — ด่านปลดล็อกรายงานแทนเกตเวย์ชำระเงิน

เส้นทางสาธารณะมีตัวเดียว: POST /access-codes/redeem
ที่เหลืออยู่หลัง /admin ซึ่งผ่าน JwtMiddleware + IsAdmin แล้ว
*/

/* ── สาธารณะ: ตรวจและใช้รหัส ────────────────────────────── */

type redeemAccessCodeBody struct {
	Code   string `json:"code" validate:"required,max=64"`
	AnonID string `json:"anon_id" validate:"max=64"`
}

// ข้อความอธิบายผู้ใช้ตรง ๆ ว่าทำไมรหัสใช้ไม่ได้ — ไม่ปล่อยให้หน้าเว็บเดาเอง
var accessCodeReasonTh = map[models.AccessCodeStatus]string{
	models.AccessCodeNotFound:  "ไม่พบรหัสนี้ในระบบ — ตรวจตัวสะกดอีกครั้ง",
	models.AccessCodeExpired:   "รหัสนี้หมดอายุแล้ว",
	models.AccessCodeRevoked:   "รหัสนี้ถูกยกเลิกแล้ว",
	models.AccessCodeExhausted: "รหัสนี้ใช้ครบจำนวนที่กำหนดไว้แล้ว",
}

func (s *Server) RedeemAccessCode(c echo.Context) error {
	var body redeemAccessCodeBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	var userID *uint
	if uid := CurrentUserID(c); uid != 0 {
		userID = &uid
	}

	code, status, err := s.BillingStore.RedeemAccessCode(body.Code, body.AnonID, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot redeem access code"))
	}
	if status != models.AccessCodeOK {
		return c.JSON(http.StatusOK, map[string]any{
			"data": map[string]any{
				"ok":     false,
				"status": string(status),
				"reason": accessCodeReasonTh[status],
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"data": map[string]any{
			"ok":         true,
			"status":     string(models.AccessCodeOK),
			"code":       code.Code,
			"prefix":     code.Prefix,
			"label":      code.Label,
			"used_count": code.UsedCount,
			"max_uses":   code.MaxUses,
		},
	})
}

/* ── Admin: ออกรหัสเป็นชุด / ดูรายการ / ยกเลิก ──────────── */

type issueAccessCodesBody struct {
	// แอดมินตั้ง prefix เองได้ทุกครั้งที่ออกชุดใหม่ เช่น "G1S1-2026"
	Prefix    string   `json:"prefix" validate:"required,max=48"`
	Count     int      `json:"count" validate:"required,min=1,max=500"`
	MaxUses   int      `json:"max_uses"`
	ExpiresAt string   `json:"expires_at"` // 'YYYY-MM-DD' — ว่าง = ไม่มีวันหมดอายุ
	Labels    []string `json:"labels"`
}

func (s *Server) AdminIssueAccessCodes(c echo.Context) error {
	var body issueAccessCodesBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	var expiresAt *time.Time
	if body.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", body.ExpiresAt)
		if err != nil {
			return c.JSON(http.StatusBadRequest, request.Err("expires_at ต้องเป็นรูปแบบ YYYY-MM-DD"))
		}
		// ให้ใช้ได้ถึงสิ้นวันนั้น
		end := t.Add(24*time.Hour - time.Second)
		expiresAt = &end
	}

	var createdBy *uint
	if uid := CurrentUserID(c); uid != 0 {
		createdBy = &uid
	}

	rows, err := s.BillingStore.IssueAccessCodes(models.IssueAccessCodesInput{
		Prefix:    body.Prefix,
		Count:     body.Count,
		MaxUses:   body.MaxUses,
		ExpiresAt: expiresAt,
		Labels:    body.Labels,
		CreatedBy: createdBy,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err(err.Error()))
	}
	return c.JSON(http.StatusCreated, map[string]any{"data": rows})
}

func (s *Server) AdminListAccessCodes(c echo.Context) error {
	rows, err := s.BillingStore.ListAccessCodes(c.QueryParam("prefix"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list access codes"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows})
}

func (s *Server) AdminRevokeAccessCode(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	if err := s.BillingStore.RevokeAccessCode(uint(id)); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot revoke access code"))
	}
	return c.NoContent(http.StatusNoContent)
}

// AdminAccessCodeTimeline — ทุก event ของรหัสหนึ่ง เรียงตามเวลา
// ตอบโจทย์ "ย้อนดูว่าคนนี้กดอะไรไปบ้าง" โดยตรง
func (s *Server) AdminAccessCodeTimeline(c echo.Context) error {
	code := billing.NormalizeAccessCode(c.Param("code"))
	if code == "" {
		return c.JSON(http.StatusBadRequest, request.Err("ต้องระบุรหัส"))
	}
	redemptions, err := s.BillingStore.ListRedemptions(code, 200)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list redemptions"))
	}
	events, err := s.BillingStore.EventsByCode(code, 500)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list events"))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"data": map[string]any{
			"code":        code,
			"redemptions": redemptions,
			"events":      events,
		},
	})
}
