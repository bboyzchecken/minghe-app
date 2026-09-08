package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

/* ── การชำระเงินและใบเสร็จ ───────────────────────────────── */

// สถานะของรายการชำระเงิน — แยกจากสถานะคำสั่งซื้อ เพราะเงินกับงานเดินคนละเส้น
// (งานส่งมอบแล้วแต่เงินถูกคืนได้ / เงินเข้าแล้วแต่งานยังไม่เริ่ม)
const (
	PaymentPaid     = "paid"
	PaymentRefunded = "refunded"
	PaymentPartial  = "partially_refunded"

	// วิธีชำระเงิน
	PayMethodGateway = "pending_gateway" // รอ GB Prime Pay (Q0-3) — ยังไม่ตัดเงินจริง
	PayMethodCredit  = "credit"          // ใช้สิทธิ์ทดลองที่แอดมินให้
	PayMethodSeed    = "seed"
)

// Payment — หนึ่งแถวต่อหนึ่งการชำระเงินของคำสั่งซื้อ = หนึ่งใบเสร็จ
//
// ทำไมไม่ใช้ฟิลด์ใน orders: ใบเสร็จต้องมีเลขที่รันต่อเนื่อง แก้ย้อนหลังไม่ได้ และต้องเก็บ
// ประวัติการคืนเงินแยกต่างหากเพื่อทำบัญชี — orders เป็นสถานะงาน ไม่ใช่เอกสารทางการเงิน
type Payment struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	ReceiptNo string `gorm:"uniqueIndex;size:32;not null" json:"receipt_no"` // RCP-YYYYMM-0001

	OrderID uint  `gorm:"index;not null" json:"order_id"`
	UserID  *uint `gorm:"index" json:"user_id"`

	// snapshot ไว้ให้ใบเสร็จอ่านได้โดยไม่ต้อง join (ชื่อ/อีเมลผู้ใช้เปลี่ยนทีหลังได้)
	CustomerName  string `gorm:"size:191" json:"customer_name"`
	CustomerEmail string `gorm:"size:191" json:"customer_email"`
	Product       string `gorm:"size:16" json:"product"`
	Description   string `gorm:"size:255" json:"description"`

	AmountSatang int    `gorm:"not null;default:0" json:"amount_satang"`
	Currency     string `gorm:"size:8;default:THB" json:"currency"`
	Method       string `gorm:"size:32" json:"method"`
	ProviderRef  string `gorm:"size:191" json:"provider_ref"`
	Status       string `gorm:"size:24;default:paid;index" json:"status"`

	RefundAmountSatang int        `gorm:"default:0" json:"refund_amount_satang"`
	RefundReason       string     `gorm:"size:512" json:"refund_reason"`
	RefundedByName     string     `gorm:"size:191" json:"refunded_by_name"`
	RefundedAt         *time.Time `json:"refunded_at"`

	PaidAt    time.Time `gorm:"index" json:"paid_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ListPaymentQuery struct {
	store.PaginationQuery
	UserID  *uint
	Product string
	Status  string
	Search  string // เลขใบเสร็จ / อีเมล
}

/* ── สิทธิ์ทดลองใช้ที่แอดมินมอบให้ ───────────────────────── */

const (
	CreditAvailable = "available"
	CreditUsed      = "used"
	CreditRevoked   = "revoked"

	CreditProductAny = "any"
)

// UserCredit — "สิทธิ์ใช้ฟรี 1 ครั้ง" ที่แอดมินมอบให้ลูกค้าที่ทักมาทางไลน์/แชท
//
// ใช้ตอนชำระเงิน: ถ้ามีสิทธิ์ที่ตรงกับสินค้า ระบบหักให้อัตโนมัติ ยอดชำระเป็น 0
// และยังออกใบเสร็จ 0 บาทไว้เป็นหลักฐานเหมือนเดิม
type UserCredit struct {
	ID     uint `gorm:"primarykey" json:"id"`
	UserID uint `gorm:"index;not null" json:"user_id"`

	Product string `gorm:"size:16;default:any" json:"product"` // any | employer | jobseeker
	Depth   string `gorm:"size:16" json:"depth"`               // ว่าง = ระดับไหนก็ได้
	Note    string `gorm:"size:512" json:"note"`               // เหตุผล เช่น "ลูกค้าทักไลน์ 22/8"

	GrantedByID   uint   `gorm:"index" json:"granted_by_id"`
	GrantedByName string `gorm:"size:191" json:"granted_by_name"`

	Status      string     `gorm:"size:16;default:available;index" json:"status"`
	UsedOrderID *uint      `gorm:"index" json:"used_order_id"`
	UsedAt      *time.Time `json:"used_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Usable บอกว่าสิทธิ์นี้ใช้กับสินค้านั้นได้ตอนนี้หรือไม่
func (c UserCredit) Usable(product string, now time.Time) bool {
	if c.Status != CreditAvailable {
		return false
	}
	if c.ExpiresAt != nil && c.ExpiresAt.Before(now) {
		return false
	}
	return c.Product == CreditProductAny || c.Product == product
}

/* ── เหตุการณ์ในโฟลว์ (funnel) ─────────────────────────── */

// FunnelEvent — จุดที่ผู้ใช้เดินผ่านใน wizard ก่อนจ่ายเงิน
//
// ใช้ตอบคำถาม "คนที่ลองเล่นแต่ไม่จ่าย ไปสะดุดตรงไหน" — เก็บแค่ชื่อขั้นกับเวลา
// ไม่เก็บเนื้อหาที่กรอก (PDPA) · ผู้ใช้ที่ยังไม่ล็อกอินระบุด้วย anon_id ที่หน้าเว็บสุ่มไว้
type FunnelEvent struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	AnonID    string `gorm:"size:64;index" json:"anon_id"`
	UserID    *uint  `gorm:"index" json:"user_id"`
	Product   string `gorm:"size:16;index" json:"product"`
	Step      string `gorm:"size:48;index" json:"step"` // wizard_start, step_1..n, checkout_view, login_gate, paid
	StepIndex int    `json:"step_index"`
	// รหัสเข้าใช้ของผู้ทดสอบ (รอบ UAT) — ผูกตั้งแต่ก่อนล็อกอิน จึงย้อนดูรายคนได้ทั้งเส้นทาง
	Code      string    `gorm:"size:64;index" json:"code"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

/* ── สถิติย้อนหลัง ──────────────────────────────────────── */

// StatsBucket — หนึ่งช่องเวลา (วัน/เดือน/ปี) ในกราฟย้อนหลัง
type StatsBucket struct {
	Key                    string `json:"key"` // 2026-08-22 | 2026-08 | 2026
	RevenueEmployerSatang  int64  `json:"revenue_employer_satang"`
	RevenueJobseekerSatang int64  `json:"revenue_jobseeker_satang"`
	RefundSatang           int64  `json:"refund_satang"`
	PaymentsCount          int64  `json:"payments_count"`
	OrdersEmployer         int64  `json:"orders_employer"`
	OrdersJobseeker        int64  `json:"orders_jobseeker"`
	Signups                int64  `json:"signups"`
	TrialsStarted          int64  `json:"trials_started"` // anon/user ที่เริ่ม wizard
	TrialsPaid             int64  `json:"trials_paid"`
}

// FunnelStepCount — จำนวนคน (distinct) ที่ไปถึงแต่ละขั้นในช่วงเวลา
type FunnelStepCount struct {
	Product string `json:"product"`
	Step    string `json:"step"`
	Index   int    `json:"step_index"`
	Count   int64  `json:"count"`
}

// DropoffUser — คนที่เริ่มโฟลว์แล้วไม่จ่าย พร้อมขั้นสุดท้ายที่ไปถึง
type DropoffUser struct {
	AnonID     string     `json:"anon_id"`
	UserID     *uint      `json:"user_id"`
	Email      string     `json:"email"`
	Name       string     `json:"name"`
	Product    string     `json:"product"`
	LastStep   string     `json:"last_step"`
	LastIndex  int        `json:"last_step_index"`
	LastSeenAt time.Time  `json:"last_seen_at"`
	FirstAt    time.Time  `json:"first_at"`
	HasCredit  bool       `json:"has_credit"`
	GrantedAt  *time.Time `json:"granted_at"`
}

type BillingStore interface {
	CreatePayment(p *Payment) error
	FindPayment(id int) (*Payment, error)
	ListPayments(query ListPaymentQuery) ([]*Payment, *store.PaginationResult, error)
	UpdatePayment(p *Payment) error
	// NextReceiptNo ออกเลขใบเสร็จรันต่อเนื่องในเดือนนั้น
	NextReceiptNo(now time.Time) (string, error)

	CreateCredit(c *UserCredit) error
	FindCredit(id int) (*UserCredit, error)
	ListCredits(userID *uint, status string) ([]*UserCredit, error)
	UpdateCredit(c *UserCredit) error

	CreateEvent(e *FunnelEvent) error
	// FunnelCounts นับ distinct คนที่ไปถึงแต่ละขั้นในช่วงเวลา
	FunnelCounts(from, to time.Time) ([]FunnelStepCount, error)
	// Dropoffs คืนคนที่เริ่มโฟลว์ในช่วงเวลาแต่ยังไม่มี event "paid"
	Dropoffs(from, to time.Time, limit int) ([]DropoffUser, error)

	// Series สรุปตัวเลขตามช่วงเวลา granularity = day | month | year
	Series(granularity string, from, to time.Time) ([]StatsBucket, error)

	// รหัสเข้าใช้รอบ UAT — ด่านปลดล็อกแทนการชำระเงิน (ดู access_code.go)
	AccessCodeStore
}
