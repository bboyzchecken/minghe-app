package api

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/models"
)

type modeResponse struct {
	Mode               string               `json:"mode"`
	GoogleLoginEnabled bool                 `json:"google_login_enabled"`
	GoogleLoginNote    string               `json:"google_login_note,omitempty"`
	MockAccounts       []models.MockAccount `json:"mock_accounts"`
}

// GetMode บอกหน้าเว็บว่า API ตัวนี้ทำงานโหมดไหน และมีบัญชีทดลองให้กดหรือไม่
//
// จุดสำคัญ: รายการบัญชีทดลองถูกส่งออกเฉพาะโหมด mock เท่านั้น
// โหมด live จะได้ลิสต์ว่างเสมอ แม้ฐานข้อมูลจะยังมีบัญชีเหล่านั้นค้างอยู่จากการทดสอบก็ตาม
func (s *Server) GetMode(c echo.Context) error {
	res := modeResponse{
		Mode:               s.Config.Mode,
		GoogleLoginEnabled: s.Config.GoogleLoginEnabled,
		MockAccounts:       []models.MockAccount{},
	}
	if !s.Config.GoogleLoginEnabled {
		res.GoogleLoginNote = "ยังไม่เปิดใช้งาน — รอเชื่อม Google OAuth client"
	}
	if s.Config.Mode == core.ModeMock {
		res.MockAccounts = models.MockAccounts()
	}
	return c.JSON(http.StatusOK, res)
}
