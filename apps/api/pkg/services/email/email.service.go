package email

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/logger"
)

type EmailService struct {
	config core.GoogleAPIConfig
	appURL string
	svc    *gmail.Service
}

// New สร้าง service ส่งอีเมลผ่าน Gmail API
// ถ้าตั้งค่า OAuth ไม่ครบ จะคืน service ที่ log อีเมลลง stdout แทนการส่งจริง
// เพื่อให้รันในเครื่อง dev ได้โดยไม่ต้องมี credential
func New(cfg core.Config) *EmailService {
	s := &EmailService{config: cfg.GoogleAPI, appURL: cfg.AppBaseURL}

	if cfg.GoogleAPI.ClientID == "" || cfg.GoogleAPI.RefreshToken == "" {
		logger.Warn("gmail credentials not configured — emails will be logged instead of sent")
		return s
	}

	oauthConfig := &oauth2.Config{
		ClientID:     cfg.GoogleAPI.ClientID,
		ClientSecret: cfg.GoogleAPI.ClientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{gmail.GmailSendScope},
	}
	token := &oauth2.Token{
		AccessToken:  cfg.GoogleAPI.AccessToken,
		RefreshToken: cfg.GoogleAPI.RefreshToken,
		TokenType:    "Bearer",
	}

	client := oauthConfig.Client(context.Background(), token)
	svc, err := gmail.NewService(context.Background(), option.WithHTTPClient(client))
	if err != nil {
		logger.Error("cannot init gmail service: ", err)
		return s
	}
	s.svc = svc
	return s
}

// Send ส่งอีเมล HTML หนึ่งฉบับ
func (s *EmailService) Send(to, subject, htmlBody string) error {
	if s.svc == nil {
		logger.WithFields(map[string]any{"to": to, "subject": subject}).
			Info("email not sent (gmail not configured)")
		return nil
	}

	from := s.config.SenderEmail
	if from == "" {
		from = "me"
	}

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n\r\n")
	msg.WriteString(htmlBody)

	raw := base64.URLEncoding.EncodeToString([]byte(msg.String()))
	_, err := s.svc.Users.Messages.Send("me", &gmail.Message{Raw: raw}).Do()
	return err
}

// SendOTP ส่งรหัสยืนยันพร้อมเลขอ้างอิง
// เลขอ้างอิงมีไว้ให้ผู้ใช้เทียบว่ากำลังกรอกรหัสจากอีเมลฉบับที่ถูกต้อง
func (s *EmailService) SendOTP(to, code, ref, purpose string) error {
	title := "รหัสยืนยันการสมัครสมาชิก"
	if purpose == "reset_password" {
		title = "รหัสยืนยันการตั้งรหัสผ่านใหม่"
	}

	body := fmt.Sprintf(`
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2b2b2b">
  <div style="font-size:20px;color:#b07d2b;letter-spacing:2px">命合 Mìnghé</div>
  <h1 style="font-size:20px;margin:20px 0 8px">%s</h1>
  <p style="color:#5c5c5c;margin:0 0 24px">กรอกรหัสนี้เพื่อดำเนินการต่อ รหัสมีอายุ 10 นาที</p>
  <div style="background:#faf7f1;border:1px solid #e8e0d2;border-radius:12px;padding:20px;text-align:center">
    <div style="font-size:32px;font-weight:600;letter-spacing:8px;color:#b07d2b">%s</div>
    <div style="font-size:12px;color:#8a8a8a;margin-top:8px">เลขอ้างอิง: %s</div>
  </div>
  <p style="color:#8a8a8a;font-size:12px;margin-top:24px">
    หากคุณไม่ได้เป็นผู้ขอรหัสนี้ ไม่ต้องดำเนินการใด ๆ และโปรดอย่าส่งรหัสนี้ให้ผู้อื่น
  </p>
</div>`, title, code, ref)

	return s.Send(to, title+" · Mìnghé", body)
}

// SendReportReady แจ้งว่ารายงานพร้อมอ่าน พร้อมรหัสเปิด
func (s *EmailService) SendReportReady(to, accessCode string) error {
	body := fmt.Sprintf(`
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2b2b2b">
  <div style="font-size:20px;color:#b07d2b;letter-spacing:2px">命合 Mìnghé</div>
  <h1 style="font-size:20px;margin:20px 0 8px">รายงานของคุณพร้อมแล้ว</h1>
  <p style="color:#5c5c5c">เปิดอ่านได้ด้วยรหัสด้านล่าง</p>
  <div style="background:#faf7f1;border:1px solid #e8e0d2;border-radius:12px;padding:20px;text-align:center">
    <div style="font-size:24px;font-weight:600;letter-spacing:3px;color:#b07d2b">%s</div>
  </div>
  <p style="margin-top:24px"><a href="%s/r" style="color:#b07d2b">เปิดรายงาน</a></p>
</div>`, accessCode, s.appURL)

	return s.Send(to, "รายงานของคุณพร้อมแล้ว · Mìnghé", body)
}

// Configured บอกว่ามี credential ส่งอีเมลจริงหรือไม่ — ถ้าไม่มี อีเมลจะถูก log แทนการส่ง
func (s *EmailService) Configured() bool { return s.svc != nil }
