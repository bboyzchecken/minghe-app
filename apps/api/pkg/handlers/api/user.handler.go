package api

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
)

func (s *Server) GetMe(c echo.Context) error {
	user, err := s.UserStore.Find(int(CurrentUserID(c)))
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}
	return c.JSON(http.StatusOK, user)
}

type updateMeBody struct {
	Name   string `json:"name"`
	Phone  string `json:"phone"`
	Locale string `json:"locale" validate:"omitempty,oneof=th en"`
}

func (s *Server) UpdateMe(c echo.Context) error {
	var body updateMeBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	user, err := s.UserStore.Find(int(CurrentUserID(c)))
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}

	if body.Name != "" {
		user.Name = body.Name
	}
	if body.Phone != "" {
		user.Phone = body.Phone
	}
	if body.Locale != "" {
		user.Locale = body.Locale
	}

	if err := s.UserStore.Update(user); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update user"))
	}
	return c.JSON(http.StatusOK, user)
}

// RequestAccountDeletion — สิทธิขอลบบัญชีตาม PDPA (F-01)
//
// ตั้งใจไม่ลบเรคคอร์ดทันที: ยังต้องเก็บคำสั่งซื้อและเอกสารการชำระเงินตามกฎหมายภาษี
// จึงเปลี่ยนสถานะเป็น deactivated ก่อน แล้วให้ผู้ดูแลระบบดำเนินการลบข้อมูลส่วนบุคคลตาม
// นโยบายที่จะสรุปใน F-01 (ระยะเวลาและขอบเขตยังไม่ล็อก — ดู docs/uat-2026-08-01-feedback-plan.md)
func (s *Server) RequestAccountDeletion(c echo.Context) error {
	user, err := s.UserStore.Find(int(CurrentUserID(c)))
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}

	user.Status = models.StatusDeactivated
	if err := s.UserStore.Update(user); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot deactivate account"))
	}

	return c.JSON(http.StatusAccepted, map[string]string{
		"status":  "pending_deletion",
		"message": "บัญชีถูกระงับแล้ว ทีมงานจะดำเนินการลบข้อมูลตามนโยบายและติดต่อกลับทางอีเมล",
	})
}
