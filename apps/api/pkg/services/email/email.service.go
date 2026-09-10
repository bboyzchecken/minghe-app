package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/logger"
)

// เวลารอสูงสุดต่อการเชื่อมต่อหนึ่งครั้ง — กันไม่ให้ request สมัครสมาชิกค้าง
// เมื่อเซิร์ฟเวอร์ปลายทางไม่ตอบ (net/smtp ไม่มี timeout ในตัว)
const smtpTimeout = 20 * time.Second

// resendEndpoint — REST API ของ Resend วิ่งผ่าน HTTPS จึงไม่โดนนโยบายบล็อก SMTP
const resendEndpoint = "https://api.resend.com/emails"

type EmailService struct {
	transport string
	config    core.GoogleAPIConfig
	resend    core.ResendConfig
	smtp      core.SMTPConfig
	appURL    string
	svc       *gmail.Service
	http      *http.Client
}

// New สร้าง service ส่งอีเมล โดยเลือกช่องทางตามค่าที่ตั้งไว้
//
// ตั้ง MAIL_TRANSPORT = resend | smtp | gmail | log เพื่อบังคับช่องทางตรง ๆ
// เว้นว่างไว้ = เลือกเองตามลำดับนี้
//
//  1. Resend      — เมื่อมี RESEND_API_KEY (ส่งผ่าน HTTPS พอร์ต 443)
//  2. SMTP        — เมื่อมี SMTP_HOST และ SMTP_USERNAME
//  3. Gmail API   — เมื่อมี GMAIL_CLIENT_ID และ GMAIL_REFRESH_TOKEN (HTTPS เช่นกัน)
//  4. log เท่านั้น — ไม่มีสักอย่าง (โหมด dev รันได้โดยไม่ต้องมี credential)
//
// สลับช่องทางได้ด้วยการแก้ .env อย่างเดียว ไม่ต้อง build ใหม่
func New(cfg core.Config) *EmailService {
	s := &EmailService{
		transport: cfg.MailTransport,
		config:    cfg.GoogleAPI,
		resend:    cfg.Resend,
		smtp:      cfg.SMTP,
		appURL:    cfg.AppBaseURL,
		http:      &http.Client{Timeout: smtpTimeout},
	}

	// Gmail API ต้องสร้าง client ไว้ล่วงหน้าเสมอ เพราะ resolve() ใช้ svc เป็นตัวชี้ว่าพร้อมหรือยัง
	if cfg.GoogleAPI.ClientID != "" && cfg.GoogleAPI.RefreshToken != "" {
		s.initGmail(cfg)
	}

	switch s.resolve() {
	case transportResend:
		logger.Info("email: ส่งผ่าน Resend ในนาม ", s.senderHeader())
	case transportSMTP:
		logger.Info("email: ส่งผ่าน SMTP ", cfg.SMTP.Host, ":", cfg.SMTP.Port, " ในนาม ", s.fromAddress())
	case transportGmail:
		logger.Info("email: ส่งผ่าน Gmail API ในนาม ", firstNonEmptySender(cfg.GoogleAPI.SenderEmail, "บัญชีที่อนุญาตไว้"))
	default:
		if s.transport != "" && s.transport != transportAuto {
			logger.Error("email: MAIL_TRANSPORT=", s.transport, " แต่ยังตั้งค่าช่องทางนั้นไม่ครบ — อีเมลจะไม่ถูกส่ง")
		} else {
			logger.Warn("email credentials not configured — emails will be logged instead of sent")
		}
	}
	return s
}

const (
	transportAuto   = "auto"
	transportResend = "resend"
	transportSMTP   = "smtp"
	transportGmail  = "gmail"
	transportLog    = "log"
)

// resolve บอกว่าจะส่งผ่านช่องทางไหนจริง ๆ
//
// ถ้า MAIL_TRANSPORT ระบุไว้ชัดเจนก็เคารพค่านั้นเสมอ แม้จะตั้งค่าไม่ครบ —
// ตั้งใจให้ล้มเหลวแบบเห็นชัดพร้อมบอกสาเหตุ ดีกว่าเงียบ ๆ ไปใช้ช่องทางอื่น
// ที่ไม่ได้ตั้งใจแล้วอีเมลออกจากที่อยู่ผิด
func (s *EmailService) resolve() string {
	switch s.transport {
	case transportResend, transportSMTP, transportGmail, transportLog:
		return s.transport
	}

	switch {
	case s.resendConfigured():
		return transportResend
	case s.smtpConfigured():
		return transportSMTP
	case s.svc != nil:
		return transportGmail
	default:
		return transportLog
	}
}

func firstNonEmptySender(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

// initGmail เตรียม client ของ Gmail API ไว้ใช้เมื่อ resolve() เลือกช่องทางนี้
func (s *EmailService) initGmail(cfg core.Config) {
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
		return
	}
	s.svc = svc
}

// Send ส่งอีเมล HTML หนึ่งฉบับผ่านช่องทางที่ตั้งไว้
func (s *EmailService) Send(to, subject, htmlBody string) error {
	switch s.resolve() {
	case transportResend:
		if !s.resendConfigured() {
			return fmt.Errorf("resend: ยังไม่ได้ตั้ง RESEND_API_KEY หรือที่อยู่ผู้ส่ง")
		}
		return s.sendResend(to, subject, htmlBody)
	case transportSMTP:
		if !s.smtpConfigured() {
			return fmt.Errorf("smtp: ยังไม่ได้ตั้ง SMTP_HOST หรือ SMTP_USERNAME")
		}
		return s.sendSMTP(to, subject, htmlBody)
	case transportGmail:
		if s.svc == nil {
			return fmt.Errorf("gmail: ยังไม่ได้ตั้ง GMAIL_CLIENT_ID หรือ GMAIL_REFRESH_TOKEN")
		}
		return s.sendGmailAPI(to, subject, htmlBody)
	default:
		logger.WithFields(map[string]any{"to": to, "subject": subject}).
			Info("email not sent (no mail transport configured)")
		return nil
	}
}

func (s *EmailService) resendConfigured() bool {
	return s.resend.APIKey != "" && s.resend.SenderEmail != ""
}

// senderHeader ประกอบค่า From สำหรับ Resend
//
// ไม่ต้องเข้ารหัส RFC 2047 เอง — Resend รับ UTF-8 ตรง ๆ แล้วจัดการให้
// (ต่างจากทาง SMTP ที่เราประกอบซองจดหมายเองจึงต้องเข้ารหัสก่อนส่ง)
func (s *EmailService) senderHeader() string {
	if s.resend.SenderName == "" {
		return s.resend.SenderEmail
	}
	return fmt.Sprintf("%s <%s>", s.resend.SenderName, s.resend.SenderEmail)
}

func (s *EmailService) sendResend(to, subject, htmlBody string) error {
	payload, err := json.Marshal(map[string]any{
		"from":    s.senderHeader(),
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.resend.APIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := s.http.Do(req)
	if err != nil {
		return fmt.Errorf("resend: เรียก API ไม่สำเร็จ: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}

	// เนื้อความที่ Resend ตอบกลับบอกสาเหตุตรง ๆ เช่นโดเมนยังไม่ยืนยันหรือคีย์ผิด
	// จำกัดความยาวกันไม่ให้ log บวมเวลาเจอหน้า error แบบ HTML
	body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
	return fmt.Errorf("resend: ตอบกลับ %s: %s", res.Status, strings.TrimSpace(string(body)))
}

func (s *EmailService) smtpConfigured() bool {
	return s.smtp.Host != "" && s.smtp.Username != ""
}

// fromAddress คืนที่อยู่ผู้ส่งจริงที่ใช้ในซอง SMTP (MAIL FROM)
//
// ต้องเป็นที่อยู่ของกล่องจดหมายที่ล็อกอินเข้าไป ไม่งั้นเซิร์ฟเวอร์ปฏิเสธด้วย
// "not allowed to send as" — GoDaddy บังคับข้อนี้เข้มกว่าผู้ให้บริการทั่วไป
func (s *EmailService) fromAddress() string {
	if s.smtp.SenderEmail != "" {
		return s.smtp.SenderEmail
	}
	return s.smtp.Username
}

// buildMessage ประกอบอีเมลตาม RFC 5322
//
// หัวข้อและชื่อผู้ส่งเป็นภาษาไทย/จีน จึงต้องเข้ารหัสแบบ RFC 2047 ก่อน
// ไม่งั้นบางไคลเอนต์แสดงเป็นอักขระเสีย และบางตัวนับเป็นสัญญาณของสแปม
func (s *EmailService) buildMessage(to, subject, htmlBody string) []byte {
	from := s.fromAddress()
	fromHeader := from
	if s.smtp.SenderName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", s.smtp.SenderName), from)
	}

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s\r\n", fromHeader)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject))
	fmt.Fprintf(&msg, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n\r\n")
	msg.WriteString(htmlBody)
	return []byte(msg.String())
}

func (s *EmailService) sendSMTP(to, subject, htmlBody string) error {
	client, err := s.dialSMTP()
	if err != nil {
		return fmt.Errorf("smtp: เชื่อมต่อ %s:%s ไม่สำเร็จ: %w", s.smtp.Host, s.smtp.Port, err)
	}
	defer client.Close()

	auth := smtp.PlainAuth("", s.smtp.Username, s.smtp.Password, s.smtp.Host)
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("smtp: ล็อกอินไม่ผ่าน (ตรวจ SMTP_USERNAME / SMTP_PASSWORD): %w", err)
	}

	from := s.fromAddress()
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("smtp: เซิร์ฟเวอร์ไม่ยอมให้ส่งในนาม %s: %w", from, err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp: ปลายทาง %s ถูกปฏิเสธ: %w", to, err)
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(s.buildMessage(to, subject, htmlBody)); err != nil {
		w.Close()
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

// dialSMTP รองรับทั้งสองรูปแบบที่ผู้ให้บริการใช้กัน
//
//	พอร์ต 465 — TLS ตั้งแต่วินาทีแรก (implicit)
//	พอร์ตอื่น  — ต่อธรรมดาแล้วยก TLS ด้วย STARTTLS (587 คือค่ามาตรฐาน)
//
// ถ้าเซิร์ฟเวอร์ไม่รองรับ STARTTLS จะเลิกทำทันที ไม่ยอมส่งรหัสผ่านผ่านช่องทางที่ไม่ได้เข้ารหัส
func (s *EmailService) dialSMTP() (*smtp.Client, error) {
	addr := net.JoinHostPort(s.smtp.Host, s.smtp.Port)
	dialer := &net.Dialer{Timeout: smtpTimeout}
	tlsConfig := &tls.Config{ServerName: s.smtp.Host, MinVersion: tls.VersionTLS12}

	if s.smtp.Port == "465" {
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
		if err != nil {
			return nil, err
		}
		_ = conn.SetDeadline(time.Now().Add(smtpTimeout))
		return smtp.NewClient(conn, s.smtp.Host)
	}

	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return nil, err
	}
	_ = conn.SetDeadline(time.Now().Add(smtpTimeout))

	client, err := smtp.NewClient(conn, s.smtp.Host)
	if err != nil {
		conn.Close()
		return nil, err
	}
	if ok, _ := client.Extension("STARTTLS"); !ok {
		client.Close()
		return nil, fmt.Errorf("เซิร์ฟเวอร์ไม่รองรับ STARTTLS — ปฏิเสธการส่งรหัสผ่านแบบไม่เข้ารหัส")
	}
	if err := client.StartTLS(tlsConfig); err != nil {
		client.Close()
		return nil, err
	}
	return client, nil
}

func (s *EmailService) sendGmailAPI(to, subject, htmlBody string) error {
	// Gmail ส่งในนามบัญชีที่ออก refresh token เสมอ — ค่านี้จึงมีผลแค่กับหัวจดหมาย
	// ที่ผู้รับเห็น และต้องตรงกับบัญชีนั้นหรือ alias ที่ยืนยันไว้ ไม่งั้น Gmail เขียนทับให้เอง
	from := s.config.SenderEmail
	if from == "" {
		from = "me"
	} else if s.config.SenderName != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", s.config.SenderName), from)
	}

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject))
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
