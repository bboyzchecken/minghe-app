package store

import (
	"math"

	"gorm.io/gorm"
)

const (
	DefaultLimit = 20
	MaxLimit     = 100
)

type PaginationQuery struct {
	Page  int `query:"page"`
	Limit int `query:"limit"`
}

type PaginationResult struct {
	Total       int64 `json:"total"`
	TotalPages  int   `json:"total_pages"`
	CurrentPage int   `json:"current_page"`
	Limit       int   `json:"limit"`
}

// Normalize ปรับค่า page/limit ให้อยู่ในช่วงที่ยอมรับได้ก่อนนำไปใช้
func (q *PaginationQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 {
		q.Limit = DefaultLimit
	}
	if q.Limit > MaxLimit {
		q.Limit = MaxLimit
	}
}

func WithPagination(db *gorm.DB, query *PaginationQuery) *gorm.DB {
	query.Normalize()
	return db.Offset((query.Page - 1) * query.Limit).Limit(query.Limit)
}

func NewPaginationResult(total int64, page, limit int) *PaginationResult {
	q := PaginationQuery{Page: page, Limit: limit}
	q.Normalize()
	totalPages := 0
	if q.Limit > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(q.Limit)))
	}
	return &PaginationResult{
		Total:       total,
		TotalPages:  totalPages,
		CurrentPage: q.Page,
		Limit:       q.Limit,
	}
}

// LikeSearch คืน pattern สำหรับ LIKE โดย escape อักขระพิเศษ
func LikeSearch(term string) string {
	escaped := make([]rune, 0, len(term)+2)
	for _, r := range term {
		if r == '%' || r == '_' || r == '\\' {
			escaped = append(escaped, '\\')
		}
		escaped = append(escaped, r)
	}
	return "%" + string(escaped) + "%"
}
