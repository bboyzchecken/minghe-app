package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

// slug ของเอกสารกฎหมายทั้งสี่ฉบับที่ payment gateway ขอ (F-01)
const (
	DocTerms   = "terms"
	DocPrivacy = "privacy"
	DocRefund  = "refund"
	DocCookies = "cookies"

	DocDraft     = "draft"
	DocPublished = "published"
)

// LegalDocument — เก็บเนื้อหาเอกสารแบบมีเวอร์ชัน
// จำเป็นเพราะต้องพิสูจน์ได้ว่าผู้ใช้ยอมรับ "เวอร์ชันไหน" ตอนไหน
type LegalDocument struct {
	ID          uint       `gorm:"primarykey" json:"id"`
	Slug        string     `gorm:"index:idx_doc_ver,unique;size:32;not null" json:"slug"`
	Version     string     `gorm:"index:idx_doc_ver,unique;size:16;not null" json:"version"`
	Locale      string     `gorm:"index:idx_doc_ver,unique;size:8;default:th" json:"locale"`
	Title       string     `gorm:"size:191;not null" json:"title"`
	ContentMD   string     `gorm:"type:longtext" json:"content_md"`
	EffectiveAt *time.Time `json:"effective_at"`
	Status      string     `gorm:"size:16;default:draft" json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Consent — บันทึกการกดยอมรับก่อนชำระเงิน (F-06)
//
// เก็บ UserID เป็น pointer เพราะโฟลว์ trial อนุญาตให้กรอกก่อนล็อกอิน (F-03)
// เมื่อผู้ใช้สมัคร/ล็อกอินสำเร็จ ให้ผูก UserID ย้อนหลังด้วย AttachUser
type Consent struct {
	ID      uint   `gorm:"primarykey" json:"id"`
	UserID  *uint  `gorm:"index" json:"user_id"`
	OrderID *uint  `gorm:"index" json:"order_id"`
	Email   string `gorm:"size:191;index" json:"email"`

	// เก็บเป็นคู่ slug:version คั่นด้วย comma เช่น "terms:1.0,privacy:1.0,refund:1.0"
	AcceptedDocs string `gorm:"size:512;not null" json:"accepted_docs"`

	IPAddress  string    `gorm:"size:64" json:"ip_address"`
	UserAgent  string    `gorm:"size:512" json:"user_agent"`
	AcceptedAt time.Time `json:"accepted_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type ListConsentQuery struct {
	store.PaginationQuery
	UserID *uint
	Email  string
}

type ConsentStore interface {
	Create(consent *Consent) error
	Find(id int) (*Consent, error)
	List(query ListConsentQuery) ([]*Consent, *store.PaginationResult, error)
	AttachUser(consentID, userID uint) error
	AttachOrder(consentID, orderID uint) error

	UpsertDocument(doc *LegalDocument) error
	FindPublishedDocument(slug, locale string) (*LegalDocument, error)
	ListDocuments(locale string) ([]*LegalDocument, error)
}
