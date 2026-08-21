package models

import (
	"time"

	"github.com/minghe/api/pkg/store"
)

const (
	ReportDraft     = "draft"
	ReportInReview  = "in_review" // รอซินแสตรวจทาน
	ReportPublished = "published"
)

// Report — ผลลัพธ์ของ Order หนึ่งใบ
//
// ฟิลด์ JSON แต่ละก้อนแมปกับ feedback ที่ยังต้องพัฒนา เก็บแยกกันเพื่อให้
// ทยอยเติมได้ทีละส่วนโดยไม่ต้องเปลี่ยน schema ซ้ำ:
//
//	NarrativeJSON   — คำบรรยายที่คนไม่รู้จักปาจืออ่านเข้าใจ (F-23)
//	PairMatrixJSON  — ความสัมพันธ์รายคู่ candidate × สมาชิกทีมแต่ละคน (F-20)
//	MomentumJSON    — momentum ตามช่วงเวลาของแต่ละคน (F-21) และจังหวะที่ควรทบทวน (F-22)
//	WatchpointsJSON — ตาราง "จุดที่ควรบริหาร" (F-24)
//	ChartJSON       — ข้อมูลสำหรับ BaZi Profiling Chart (F-27)
type Report struct {
	ID      uint `gorm:"primarykey" json:"id"`
	OrderID uint `gorm:"index;not null" json:"order_id"`
	Version int  `gorm:"default:1" json:"version"`

	ScoreOverall int    `json:"score_overall"` // ดัชนีสมพงษ์ 0–100
	ScoreBand    string `gorm:"size:32" json:"score_band"`
	SummaryTH    string `gorm:"type:text" json:"summary_th"`

	NarrativeJSON   *string `gorm:"type:json" json:"-"`
	PairMatrixJSON  *string `gorm:"type:json" json:"-"`
	MomentumJSON    *string `gorm:"type:json" json:"-"`
	WatchpointsJSON *string `gorm:"type:json" json:"-"`
	ChartJSON       *string `gorm:"type:json" json:"-"`

	EngineVersion string     `gorm:"size:32" json:"engine_version"`
	CopyVersion   string     `gorm:"size:32" json:"copy_version"` // เวอร์ชันของชั้นภาษา แยกจาก engine (F-23)
	ReviewedBy    string     `gorm:"size:191" json:"reviewed_by"`
	ReviewedAt    *time.Time `json:"reviewed_at"`
	Status        string     `gorm:"size:16;default:draft;index" json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type ListReportQuery struct {
	store.PaginationQuery
	OrderID uint
	Status  string
}

type ReportStore interface {
	Create(report *Report) error
	Find(id int) (*Report, error)
	FindLatestByOrder(orderID uint) (*Report, error)
	List(query ListReportQuery) ([]*Report, *store.PaginationResult, error)
	Update(report *Report) error
	Delete(id int) error
}
