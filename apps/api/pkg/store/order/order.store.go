package order

import (
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type orderStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.OrderStore {
	return &orderStoreService{db: db}
}

func (s *orderStoreService) Create(order *models.Order) error {
	return s.db.Create(order).Error
}

func (s *orderStoreService) Find(id int) (*models.Order, error) {
	var o models.Order
	if err := s.db.First(&o, id).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *orderStoreService) FindByCode(code string) (*models.Order, error) {
	var o models.Order
	if err := s.db.Where("code = ?", code).First(&o).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *orderStoreService) List(query models.ListOrderQuery) ([]*models.Order, *store.PaginationResult, error) {
	var orders []*models.Order
	q := s.db.Model(&models.Order{})

	if query.UserID != nil {
		q = q.Where("user_id = ?", *query.UserID)
	}
	if query.OrganizationID != nil {
		q = q.Where("organization_id = ?", *query.OrganizationID)
	}
	if query.Product != "" {
		q = q.Where("product = ?", query.Product)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Search != "" {
		q = q.Where("code LIKE ?", store.LikeSearch(query.Search))
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&orders).Error
	return orders, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *orderStoreService) Update(order *models.Order) error {
	return s.db.Save(order).Error
}

func (s *orderStoreService) Delete(id int) error {
	return s.db.Model(&models.Order{}).Where("id = ?", id).
		Update("status", models.OrderCancelled).Error
}
