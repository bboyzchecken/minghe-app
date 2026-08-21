package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

// สถานะและบทบาทของผู้ใช้ — ตาม convention ของ template (ไม่ใช้ soft delete)
const (
	RoleAdmin = "admin"
	RoleUser  = "user"

	StatusActive      = "active"
	StatusDeactivated = "deactivated"

	ProviderEmail  = "email"
	ProviderGoogle = "google"
)

// User — บัญชีผู้ใช้รายบุคคล (F-02)
// องค์กรผูกกับ User ผ่าน OrganizationMember ไม่ได้เป็นบัญชีแยกชนิด (ดู organization.go)
type User struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	Email           string     `gorm:"uniqueIndex;size:191;not null" json:"email"`
	PasswordHash    string     `gorm:"size:255" json:"-"`
	Name            string     `gorm:"size:191" json:"name"`
	Phone           string     `gorm:"size:32" json:"phone"`
	Provider        string     `gorm:"size:16;default:email" json:"provider"` // "email" | "google"
	GoogleID        string     `gorm:"uniqueIndex;size:191" json:"-"`
	AvatarURL       string     `gorm:"size:512" json:"avatar_url"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	Role            string     `gorm:"size:16;default:user" json:"role"`
	Status          string     `gorm:"size:16;default:active" json:"status"`
	Locale          string     `gorm:"size:8;default:th" json:"locale"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ListUserQuery struct {
	store.PaginationQuery
	Search string
	Role   string
	Status string
}

type UserStore interface {
	Create(user *User) error
	Find(id int) (*User, error)
	FindByEmail(email string) (*User, error)
	FindByGoogleID(googleID string) (*User, error)
	List(query ListUserQuery) ([]*User, *store.PaginationResult, error)
	Update(user *User) error
	Delete(id int) error
}
