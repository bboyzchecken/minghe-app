package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

// ชนิดของโปรไฟล์ — แยกเพื่อให้ dashboard ฝั่งคนทำงานกับฝั่งองค์กรดึงคนละชุดได้ (F-22)
const (
	ProfileKindSelf      = "self"      // ตัวผู้ใช้เอง
	ProfileKindCandidate = "candidate" // ผู้สมัครที่องค์กรกำลังพิจารณา
	ProfileKindEmployee  = "employee"  // พนักงานในทีม
	ProfileKindExecutive = "executive" // ผู้บริหาร
)

// ที่มาของความยินยอม — จำเป็นสำหรับ PDPA เมื่อองค์กรกรอกข้อมูลของบุคคลที่สาม (F-05)
const (
	ConsentSourceSelf       = "self"
	ConsentSourceThirdParty = "third_party"
)

// Profile — ข้อมูลดวงของคนหนึ่งคน คือแกนของ "ระบบ memory" (F-25)
// เก็บไว้เพื่อไม่ต้องกรอกซ้ำ และเพื่อเทียบ candidate ใหม่กับทีมเดิมได้
type Profile struct {
	ID             uint  `gorm:"primarykey" json:"id"`
	OwnerUserID    uint  `gorm:"index;not null" json:"owner_user_id"`
	OrganizationID *uint `gorm:"index" json:"organization_id"`

	Kind   string `gorm:"size:16;default:candidate" json:"kind"`
	Name   string `gorm:"size:191;not null" json:"name"`
	Gender string `gorm:"size:8" json:"gender"` // "male" | "female" | ""

	// วันเกิดเก็บเป็น DATE — ฝั่ง client ส่งมาเป็น DD/MM/YYYY แล้วแปลงที่ handler (F-07)
	BirthDate time.Time `gorm:"type:date;not null" json:"birth_date"`
	BirthTime string    `gorm:"size:5" json:"birth_time"` // "HH:MM"

	// สถานที่เกิด — รับเป็นลิงก์ Google Maps แล้ว resolve เป็นพิกัด (F-08)
	// เก็บทั้งลิงก์ต้นทางและพิกัดที่แกะได้ เพื่อให้ตรวจย้อนหลังได้ว่าแปลงมาจากอะไร
	BirthPlaceURL      string   `gorm:"size:512" json:"birth_place_url"`
	BirthPlaceLabel    string   `gorm:"size:191" json:"birth_place_label"`
	BirthLat           *float64 `json:"birth_lat"`
	BirthLng           *float64 `json:"birth_lng"`
	BirthProvince      string   `gorm:"size:64" json:"birth_province"` // fallback เมื่อแกะลิงก์ไม่ได้
	SolarTimeOffsetMin *int     `json:"solar_time_offset_min"`         // 真太陽時

	CurrentIndustryID string `gorm:"size:64" json:"current_industry_id"` // ประเภทธุรกิจปัจจุบัน (F-09)

	// ผลคำนวณที่ cache ไว้ ไม่ต้องตั้งเสาสี่ต้นซ้ำทุกครั้ง
	DayMaster    string     `gorm:"size:32" json:"day_master"`
	ChartJSON    *string    `gorm:"type:json" json:"-"`
	ChartVersion string     `gorm:"size:16" json:"chart_version"`
	ComputedAt   *time.Time `json:"computed_at"`

	ConsentSource string    `gorm:"size:16;default:self" json:"consent_source"`
	Status        string    `gorm:"size:16;default:active" json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ListProfileQuery struct {
	store.PaginationQuery
	OwnerUserID    uint
	OrganizationID *uint
	Kind           string
	Search         string
}

type ProfileStore interface {
	Create(profile *Profile) error
	Find(id int) (*Profile, error)
	FindMany(ids []uint) ([]*Profile, error)
	List(query ListProfileQuery) ([]*Profile, *store.PaginationResult, error)
	Update(profile *Profile) error
	Delete(id int) error
}
