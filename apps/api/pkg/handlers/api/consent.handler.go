package api

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/str"
)

/* ── ความยินยอม (F-06) ──────────────────────────────────── */

type createConsentBody struct {
	Email string `json:"email" validate:"omitempty,email"`
	// slug ของเอกสารที่ผู้ใช้ติ๊กยอมรับ — ต้องครบทั้งสามฉบับตามข้อความในกล่องยินยอม
	Documents []string `json:"documents" validate:"required,min=1"`
}

// requiredDocs คือชุดเอกสารที่กล่องยินยอมก่อนชำระเงินอ้างถึง (สไลด์หน้า 15)
var requiredDocs = []string{models.DocTerms, models.DocPrivacy, models.DocRefund}

// CreateConsent บันทึกว่าผู้ใช้ยอมรับเอกสารเวอร์ชันไหน เมื่อไร จาก IP ใด
//
// ใช้ OptionalJwt — โฟลว์ trial (F-03) ให้ยอมรับได้ก่อนล็อกอิน แล้วค่อยผูกบัญชี
// ย้อนหลังตอนสมัคร/ล็อกอินผ่าน consent_id
//
// เวอร์ชันของเอกสารมาจากฝั่ง server เสมอ ไม่รับจาก client — ไม่งั้นผู้ใช้
// ส่งเวอร์ชันอะไรมาก็ได้ ทำให้หลักฐานการยอมรับไม่มีน้ำหนัก
func (s *Server) CreateConsent(c echo.Context) error {
	var body createConsentBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	given := map[string]bool{}
	for _, doc := range body.Documents {
		given[strings.ToLower(strings.TrimSpace(doc))] = true
	}
	for _, doc := range requiredDocs {
		if !given[doc] {
			return c.JSON(http.StatusUnprocessableEntity,
				request.Err("ต้องยอมรับเงื่อนไขการใช้งาน นโยบายความเป็นส่วนตัว และนโยบายการคืนเงินให้ครบ"))
		}
	}

	accepted := make([]string, 0, len(given))
	for doc := range given {
		accepted = append(accepted, doc+":"+s.documentVersion(doc))
	}
	sort.Strings(accepted) // เรียงให้คงที่ เพื่อให้เทียบข้อมูลย้อนหลังได้ง่าย

	email := str.NormalizeEmail(body.Email)
	if email == "" {
		if fromToken, ok := c.Get("email").(string); ok {
			email = fromToken
		}
	}

	consent := &models.Consent{
		Email:        email,
		AcceptedDocs: strings.Join(accepted, ","),
		IPAddress:    c.RealIP(),
		UserAgent:    str.Truncate(c.Request().UserAgent(), 500),
		AcceptedAt:   time.Now(),
	}
	if userID := CurrentUserID(c); userID != 0 {
		consent.UserID = &userID
	}

	if err := s.ConsentStore.Create(consent); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot record consent"))
	}
	return c.JSON(http.StatusCreated, consent)
}

// documentVersion คืนเวอร์ชันที่มีผลบังคับใช้ของเอกสารแต่ละฉบับ
// อ่านจากฐานข้อมูลก่อน ถ้ายังไม่มีเรคคอร์ดจึงใช้ค่าจาก config
func (s *Server) documentVersion(slug string) string {
	if doc, err := s.ConsentStore.FindPublishedDocument(slug, "th"); err == nil {
		return doc.Version
	}
	switch slug {
	case models.DocTerms:
		return orDefault(s.Config.Legal.TermsVersion, "draft")
	case models.DocPrivacy:
		return orDefault(s.Config.Legal.PrivacyVersion, "draft")
	case models.DocRefund:
		return orDefault(s.Config.Legal.RefundVersion, "draft")
	case models.DocCookies:
		return orDefault(s.Config.Legal.CookiesVersion, "draft")
	default:
		return "draft"
	}
}

/* ── เอกสารกฎหมาย (F-01) ────────────────────────────────── */

// ListLegalDocuments — payment gateway ใช้ตรวจว่ามีเอกสารครบทั้งสี่ฉบับ
func (s *Server) ListLegalDocuments(c echo.Context) error {
	locale := orDefault(c.QueryParam("locale"), "th")
	docs, err := s.ConsentStore.ListDocuments(locale)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list documents"))
	}

	published := make([]*models.LegalDocument, 0, len(docs))
	for _, doc := range docs {
		if doc.Status == models.DocPublished {
			published = append(published, doc)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"data": published})
}

func (s *Server) GetLegalDocument(c echo.Context) error {
	slug := c.Param("slug")
	locale := orDefault(c.QueryParam("locale"), "th")

	doc, err := s.ConsentStore.FindPublishedDocument(slug, locale)
	if err != nil {
		// ตั้งใจแยกข้อความจาก 404 ทั่วไป — สถานะนี้คือ "ยังไม่ได้ร่าง" ไม่ใช่ "พิมพ์ URL ผิด"
		return c.JSON(http.StatusNotFound, request.Err("ยังไม่มีเอกสารฉบับเผยแพร่สำหรับ: "+slug))
	}
	return c.JSON(http.StatusOK, doc)
}
