package models

import "time"

/*
รหัสเข้าใช้สำหรับรอบ UAT (access code)

ทำไมต้องมี: รอบ UAT ยังไม่เปิดเกตเวย์ชำระเงิน จึงใช้ "รหัสเข้าใช้" เป็นด่านปลดล็อกแทน
และเป็นตัวผูกทุก event ในกรวยเข้ากับผู้ทดสอบคนหนึ่ง เพื่อย้อนดูได้ว่าใครเดินถึงไหน

รูปแบบรหัส (ตัดสิน 8 ก.ย. 2026): **รายคน แต่มีคำนำหน้าเป็นกลุ่ม**
	<PREFIX>-<NN>   เช่น  G1S1-2026-07  =  คนที่ 7 ของกลุ่ม G1S1-2026
แอดมินตั้ง prefix เองได้ทุกครั้งที่ออกชุดใหม่ ทำให้ดูรวมทั้งกลุ่มจาก prefix ก็ได้
และย้อนดูรายคนจากรหัสเต็มก็ได้ โดยไม่ต้องเลือกอย่างใดอย่างหนึ่ง

⚠️ ไม่ได้ลบระบบชำระเงิน — ตาราง payments/orders ยังอยู่ครบ รอเปิด GB Prime Pay กลับหลัง UAT
*/

// AccessCode — รหัสหนึ่งใบที่ออกให้ผู้ทดสอบหนึ่งคน
type AccessCode struct {
	ID uint `gorm:"primarykey" json:"id"`
	// รหัสเต็มที่ผู้ใช้กรอก — เก็บเป็นตัวพิมพ์ใหญ่เสมอ
	Code string `gorm:"size:64;uniqueIndex" json:"code"`
	// คำนำหน้ากลุ่ม ใช้ดูรวมทั้งกลุ่ม
	Prefix string `gorm:"size:48;index" json:"prefix"`
	// ลำดับคนภายในกลุ่ม (1, 2, 3, …)
	Seq int `json:"seq"`
	// ชื่อหรือหมายเหตุผู้ถือรหัส — แอดมินกรอกเองได้ ไม่บังคับ
	Label string `gorm:"size:120" json:"label"`
	// จำนวนรายงานที่เปิดได้ด้วยรหัสนี้ — 0 = ไม่จำกัดตลอดช่วง UAT
	MaxUses int `json:"max_uses"`
	// นับเฉพาะการใช้สิทธิ์จริง (ปลดล็อกรายงาน) ไม่นับการกรอกรหัสเฉย ๆ
	UsedCount   int        `json:"used_count"`
	ExpiresAt   *time.Time `json:"expires_at"`
	RevokedAt   *time.Time `json:"revoked_at"`
	CreatedByID *uint      `gorm:"index" json:"created_by_id"`
	CreatedAt   time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AccessCodeRedemption — ทุกครั้งที่มีคนกรอกรหัสสำเร็จ เก็บไว้เพื่อย้อนดูว่าใครเริ่มเมื่อไร
//
// เก็บ anon_id ของเบราว์เซอร์ด้วย เพราะรหัสถูกผูกตั้งแต่ก่อนล็อกอิน
// ทำให้ต่อ event ช่วงก่อนล็อกอินเข้ากับรหัสได้
type AccessCodeRedemption struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	AccessCodeID uint      `gorm:"index" json:"access_code_id"`
	Code         string    `gorm:"size:64;index" json:"code"`
	AnonID       string    `gorm:"size:64;index" json:"anon_id"`
	UserID       *uint     `gorm:"index" json:"user_id"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

/* ── ผลการตรวจรหัส ──────────────────────────────────────── */

// AccessCodeStatus — เหตุผลที่รหัสใช้ไม่ได้ ส่งกลับให้หน้าเว็บอธิบายผู้ใช้ตรง ๆ
type AccessCodeStatus string

const (
	AccessCodeOK        AccessCodeStatus = "ok"
	AccessCodeNotFound  AccessCodeStatus = "not_found"
	AccessCodeExpired   AccessCodeStatus = "expired"
	AccessCodeRevoked   AccessCodeStatus = "revoked"
	AccessCodeExhausted AccessCodeStatus = "exhausted"
)

// IssueAccessCodesInput — ออกรหัสเป็นชุดจาก prefix ที่แอดมินตั้งเอง
type IssueAccessCodesInput struct {
	Prefix    string
	Count     int
	MaxUses   int
	ExpiresAt *time.Time
	Labels    []string // ไม่บังคับ — ถ้ามีจะจับคู่ตามลำดับ
	CreatedBy *uint
}

// AccessCodeStore — เก็บและตรวจรหัสเข้าใช้
type AccessCodeStore interface {
	IssueAccessCodes(input IssueAccessCodesInput) ([]*AccessCode, error)
	FindAccessCode(code string) (*AccessCode, error)
	ListAccessCodes(prefix string) ([]*AccessCode, error)
	// RedeemAccessCode ตรวจรหัสและบันทึกการใช้ — คืนสถานะเสมอ ไม่โยน error เมื่อรหัสใช้ไม่ได้
	RedeemAccessCode(code, anonID string, userID *uint) (*AccessCode, AccessCodeStatus, error)
	RevokeAccessCode(id uint) error
	// ListRedemptions — ประวัติการกรอกรหัส เรียงใหม่ก่อน
	ListRedemptions(code string, limit int) ([]*AccessCodeRedemption, error)
	// EventsByCode — ทุกขั้นที่ผู้ถือรหัสนี้เดินผ่าน เรียงตามเวลา (เก่าไปใหม่)
	EventsByCode(code string, limit int) ([]*FunnelEvent, error)
}
