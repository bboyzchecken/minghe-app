package api

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/models"
)

type modeResponse struct {
	Mode               string `json:"mode"`
	GoogleLoginEnabled bool   `json:"google_login_enabled"`
	// GoogleClientID ปล่อยออกได้โดยไม่เป็นความลับ (ฝังในหน้าเว็บอยู่แล้วตามสเปกของ Google)
	// ส่งผ่าน API แทนการฝังตอน build เพราะหน้าเว็บเป็น static export — ได้ client id มาแล้ว
	// ตั้งค่าที่ .env ฝั่งเดียวแล้วรีสตาร์ต API พอ ไม่ต้อง build หน้าเว็บใหม่ (F-02)
	GoogleClientID  string `json:"google_client_id,omitempty"`
	GoogleLoginNote string `json:"google_login_note,omitempty"`
	// OTPRequired — false = หน้าสมัครสมาชิกข้ามขั้นกรอกรหัสยืนยันอีเมล
	OTPRequired  bool                 `json:"otp_required"`
	MockAccounts []models.MockAccount `json:"mock_accounts"`
}

// GetMode บอกหน้าเว็บว่า API ตัวนี้ทำงานโหมดไหน และมีบัญชีทดลองให้กดหรือไม่
//
// จุดสำคัญ: รายการบัญชีทดลองถูกส่งออกเฉพาะโหมด mock เท่านั้น
// โหมด live จะได้ลิสต์ว่างเสมอ แม้ฐานข้อมูลจะยังมีบัญชีเหล่านั้นค้างอยู่จากการทดสอบก็ตาม
func (s *Server) GetMode(c echo.Context) error {
	res := modeResponse{
		Mode:               s.Config.Mode,
		GoogleLoginEnabled: s.Config.GoogleLoginEnabled,
		OTPRequired:        s.Config.OTPRequired,
		MockAccounts:       []models.MockAccount{},
	}
	if s.Config.GoogleLoginEnabled && s.Config.OAuth.GoogleClientID != "" {
		res.GoogleClientID = s.Config.OAuth.GoogleClientID
	} else {
		res.GoogleLoginEnabled = false
		res.GoogleLoginNote = "ยังไม่เปิดใช้งาน — รอเชื่อม Google OAuth client"
	}
	if s.Config.Mode == core.ModeMock {
		res.MockAccounts = models.MockAccounts()
	}
	return c.JSON(http.StatusOK, res)
}
