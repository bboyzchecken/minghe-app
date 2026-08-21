package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

// สถานะคำสั่งซื้อ — ไม่ใช้ soft delete ตาม convention ของ template
const (
	OrderDraft           = "draft"            // ผู้ใช้ยังกรอกไม่จบ (trial ที่ยังไม่ล็อกอิน — F-03)
	OrderAwaitingPayment = "awaiting_payment" // ยอมรับเงื่อนไขแล้ว รอชำระ
	OrderPaid            = "paid"
	OrderProcessing      = "processing" // กำลังตั้งเสาสี่ต้น / รอซินแสตรวจ
	OrderDelivered       = "delivered"  // รายงานเปิดอ่านได้แล้ว
	OrderRefunded        = "refunded"
	OrderCancelled       = "cancelled"

	ProductEmployer  = "employer"
	ProductJobSeeker = "jobseeker"

	SpeedStandard = "standard"
	SpeedExpress  = "express"

	OrgModeExecutive   = "executive"
	OrgModeCompanyDate = "company-date"
	OrgModeIndustry    = "industry"
)

// Order — คำสั่งซื้อรายงานหนึ่งฉบับ
//
// หมายเหตุโฟลว์ (F-03): ผู้ใช้เริ่มกรอกได้โดยยังไม่ล็อกอิน (UserID เป็น nil)
// แต่ต้องมี UserID ก่อนเปลี่ยนสถานะเป็น awaiting_payment — บังคับที่ handler ไม่ใช่ที่ DB
type Order struct {
	ID   uint   `gorm:"primarykey" json:"id"`
	Code string `gorm:"uniqueIndex;size:32;not null" json:"code"` // รหัสเปิดรายงาน PJX-XXXX-XXXX

	UserID         *uint `gorm:"index" json:"user_id"`
	OrganizationID *uint `gorm:"index" json:"organization_id"`

	Product string `gorm:"size:16;not null" json:"product"` // employer | jobseeker
	Depth   string `gorm:"size:16" json:"depth"`            // standard | premium | executive
	Speed   string `gorm:"size:16;default:standard" json:"speed"`

	SubjectProfileID *uint   `gorm:"index" json:"subject_profile_id"`
	TeamID           *uint   `gorm:"index" json:"team_id"`
	OrgMode          string  `gorm:"size:16" json:"org_mode"`
	InputJSON        *string `gorm:"type:json" json:"-"` // snapshot ของสิ่งที่กรอก ณ ตอนสั่งซื้อ

	AmountSatang int    `gorm:"not null;default:0" json:"amount_satang"` // เก็บเป็นสตางค์ กันปัญหาทศนิยม
	Currency     string `gorm:"size:8;default:THB" json:"currency"`
	Status       string `gorm:"size:24;default:draft;index" json:"status"`

	ConsentID *uint `gorm:"index" json:"consent_id"` // ต้องมีก่อนชำระเงิน (F-06)

	// ผู้ดูแลที่ "รับเรื่อง" คำสั่งซื้อนี้ไว้ — กลไกกันแอดมินหลายคนทำงานชนกัน
	// เก็บชื่อเป็น snapshot ด้วย เพื่อให้หน้ารายการแสดงได้โดยไม่ต้อง join
	AssignedAdminID   *uint  `gorm:"index" json:"assigned_admin_id"`
	AssignedAdminName string `gorm:"size:191" json:"assigned_admin_name"`
	PaymentRef        string `gorm:"size:191" json:"payment_ref"`
	PaymentMethod     string `gorm:"size:32" json:"payment_method"`

	PinHash     string     `gorm:"size:255" json:"-"`
	PaidAt      *time.Time `json:"paid_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ListOrderQuery struct {
	store.PaginationQuery
	UserID         *uint
	OrganizationID *uint
	Product        string
	Status         string
	Search         string
}

type OrderStore interface {
	Create(order *Order) error
	Find(id int) (*Order, error)
	FindByCode(code string) (*Order, error)
	List(query ListOrderQuery) ([]*Order, *store.PaginationResult, error)
	Update(order *Order) error
	Delete(id int) error
	// CountByStatus ใช้ทำภาพรวมหน้า admin — คืนจำนวนคำสั่งซื้อแยกตามสถานะ
	CountByStatus() (map[string]int64, error)
}
