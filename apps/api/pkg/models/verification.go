package models

import "time"

// วัตถุประสงค์ของรหัส OTP
const (
	PurposeRegister      = "register"
	PurposeResetPassword = "reset_password"
)

// VerificationCode — OTP ที่ส่งทางอีเมลสำหรับสมัครสมาชิกและรีเซ็ตรหัสผ่าน
// เก็บเฉพาะ hash ของรหัส ไม่เก็บตัวเลขตรง ๆ
type VerificationCode struct {
	ID         uint       `gorm:"primarykey" json:"id"`
	Email      string     `gorm:"index;size:191;not null" json:"email"`
	Purpose    string     `gorm:"size:32;not null" json:"purpose"`
	Ref        string     `gorm:"size:8;not null" json:"ref"` // แสดงให้ผู้ใช้เทียบกับในอีเมล
	CodeHash   string     `gorm:"size:255;not null" json:"-"`
	Attempts   int        `gorm:"default:0" json:"attempts"`
	ExpiresAt  time.Time  `json:"expires_at"`
	ConsumedAt *time.Time `json:"consumed_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type VerificationStore interface {
	Create(code *VerificationCode) error
	FindActive(email, purpose, ref string) (*VerificationCode, error)
	Update(code *VerificationCode) error
	// นับจำนวนครั้งที่ขอรหัสในช่วงเวลาหนึ่ง — กันการยิงซ้ำ
	CountRecent(email, purpose string, since time.Time) (int64, error)
	DeleteExpired(before time.Time) error
}
