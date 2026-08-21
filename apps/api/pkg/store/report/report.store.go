package report

import (
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type reportStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.ReportStore {
	return &reportStoreService{db: db}
}

func (s *reportStoreService) Create(report *models.Report) error {
	return s.db.Create(report).Error
}

func (s *reportStoreService) Find(id int) (*models.Report, error) {
	var r models.Report
	if err := s.db.First(&r, id).Error; err != nil {
		return nil, err
	}
	return &r, nil
}

// FindLatestByOrder คืนรายงานเวอร์ชันล่าสุดของคำสั่งซื้อ
// (รายงานถูกออกซ้ำได้เมื่อซินแสแก้ หรือเมื่อชั้นภาษาเปลี่ยนเวอร์ชัน — F-23)
func (s *reportStoreService) FindLatestByOrder(orderID uint) (*models.Report, error) {
	var r models.Report
	err := s.db.Where("order_id = ?", orderID).Order("version DESC, id DESC").First(&r).Error
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *reportStoreService) List(query models.ListReportQuery) ([]*models.Report, *store.PaginationResult, error) {
	var reports []*models.Report
	q := s.db.Model(&models.Report{})

	if query.OrderID != 0 {
		q = q.Where("order_id = ?", query.OrderID)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&reports).Error
	return reports, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *reportStoreService) Update(report *models.Report) error {
	return s.db.Save(report).Error
}

func (s *reportStoreService) Delete(id int) error {
	return s.db.Delete(&models.Report{}, id).Error
}
