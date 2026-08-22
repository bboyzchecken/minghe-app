package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

// บทบาทของสมาชิกในองค์กร (F-05)
// ยังไม่สรุปว่าจะเปิดใช้ครบทั้งสามระดับหรือไม่ — ดูคำถาม Q ใน docs/uat-2026-08-01-feedback-plan.md
const (
	OrgRoleOwner  = "owner"
	OrgRoleHR     = "hr"
	OrgRoleViewer = "viewer"
)

// Organization — บัญชีบริษัท ใช้เก็บข้อมูลทีมและ candidate ข้ามครั้ง (F-05, F-25)
type Organization struct {
	ID             uint       `gorm:"primarykey" json:"id"`
	Name           string     `gorm:"size:191;not null" json:"name"`
	RegistrationNo string     `gorm:"size:32;index" json:"registration_no"` // เลขทะเบียนนิติบุคคล (DBD — F-10)
	FoundingDate   *time.Time `gorm:"type:date" json:"founding_date"`       // รับเข้ามาเป็น DD/MM/YYYY แล้วแปลง (F-07)
	IndustryID     string     `gorm:"size:64" json:"industry_id"`           // ธาตุอุตสาหกรรม
	Direction      string     `gorm:"size:32" json:"direction"`             // ทิศที่ตั้ง (ฮวงจุ้ย)
	SizeBand       string     `gorm:"size:32" json:"size_band"`
	OwnerUserID    uint       `gorm:"index;not null" json:"owner_user_id"`
	Status         string     `gorm:"size:16;default:active" json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// OrganizationMember — ผู้ใช้ที่เข้าถึงข้อมูลขององค์กรได้
type OrganizationMember struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	OrganizationID uint      `gorm:"index:idx_org_user,unique;not null" json:"organization_id"`
	UserID         uint      `gorm:"index:idx_org_user,unique;not null" json:"user_id"`
	Role           string    `gorm:"size:16;default:viewer" json:"role"`
	Status         string    `gorm:"size:16;default:active" json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// สถานะคำเชิญเข้าองค์กร (F-05)
const (
	InviteStatusPending  = "pending"
	InviteStatusAccepted = "accepted"
	InviteStatusRevoked  = "revoked"
)

// OrganizationInvite — คำเชิญที่เจ้าของส่งไปยังอีเมลที่ "ยังไม่มีบัญชี" ก็ได้
//
// ทำไมต้องมีตารางนี้: ถ้าเพิ่มสมาชิกได้เฉพาะคนที่สมัครแล้ว เจ้าของต้องไปบอกให้อีกฝ่าย
// สมัครก่อนแล้วค่อยกลับมากดเพิ่ม — คำเชิญค้างไว้ตรงนี้แล้วผูกให้อัตโนมัติตอนเขาเข้าระบบครั้งแรก
type OrganizationInvite struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	OrganizationID  uint       `gorm:"index:idx_invite_org_email,unique;not null" json:"organization_id"`
	Email           string     `gorm:"index:idx_invite_org_email,unique;size:191;not null" json:"email"`
	Role            string     `gorm:"size:16;default:hr" json:"role"`
	InvitedByUserID uint       `gorm:"index" json:"invited_by_user_id"`
	InvitedByName   string     `gorm:"size:191" json:"invited_by_name"`
	Status          string     `gorm:"size:16;default:pending" json:"status"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
}

// Expired บอกว่าคำเชิญหมดอายุแล้วหรือยัง (ExpiresAt เป็นศูนย์ = ไม่มีวันหมดอายุ)
func (i OrganizationInvite) Expired(now time.Time) bool {
	return !i.ExpiresAt.IsZero() && i.ExpiresAt.Before(now)
}

// Team — ชุดพนักงานที่เก็บไว้เทียบกับ candidate ใหม่ได้เรื่อย ๆ (F-25 ข้อ ข)
type Team struct {
	ID             uint      `gorm:"primarykey" json:"id"`
	OrganizationID uint      `gorm:"index;not null" json:"organization_id"`
	Name           string    `gorm:"size:191;not null" json:"name"`
	Note           string    `gorm:"size:512" json:"note"`
	Status         string    `gorm:"size:16;default:active" json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TeamMember — เชื่อม Team กับ Profile (ข้อมูลดวงของคนคนนั้น)
type TeamMember struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	TeamID    uint      `gorm:"index:idx_team_profile,unique;not null" json:"team_id"`
	ProfileID uint      `gorm:"index:idx_team_profile,unique;not null" json:"profile_id"`
	Position  string    `gorm:"size:191" json:"position"`
	IsLead    bool      `gorm:"default:false" json:"is_lead"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Profile *Profile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
}

type ListOrganizationQuery struct {
	store.PaginationQuery
	Search string
	UserID uint // จำกัดเฉพาะองค์กรที่ผู้ใช้เป็นสมาชิก
}

type OrganizationStore interface {
	Create(org *Organization) error
	Find(id int) (*Organization, error)
	List(query ListOrganizationQuery) ([]*Organization, *store.PaginationResult, error)
	Update(org *Organization) error
	Delete(id int) error

	AddMember(member *OrganizationMember) error
	FindMember(orgID, userID uint) (*OrganizationMember, error)
	ListMembers(orgID uint) ([]*OrganizationMember, error)
	UpdateMember(member *OrganizationMember) error
	RemoveMember(orgID, userID uint) error

	CreateInvite(invite *OrganizationInvite) error
	FindInvite(id int) (*OrganizationInvite, error)
	ListInvites(orgID uint, status string) ([]*OrganizationInvite, error)
	// ListPendingInvitesByEmail ใช้ตอนผู้ใช้เข้าระบบ เพื่อผูกคำเชิญที่ค้างอยู่ให้อัตโนมัติ
	ListPendingInvitesByEmail(email string) ([]*OrganizationInvite, error)
	UpdateInvite(invite *OrganizationInvite) error

	CreateTeam(team *Team) error
	FindTeam(id int) (*Team, error)
	ListTeams(orgID uint) ([]*Team, error)
	UpdateTeam(team *Team) error

	AddTeamMember(member *TeamMember) error
	ListTeamMembers(teamID uint) ([]*TeamMember, error)
	RemoveTeamMember(teamID, profileID uint) error
}
