package user

import (
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type userStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.UserStore {
	return &userStoreService{db: db}
}

func (s *userStoreService) Create(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *userStoreService) Find(id int) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userStoreService) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userStoreService) FindByGoogleID(googleID string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("google_id = ?", googleID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userStoreService) List(query models.ListUserQuery) ([]*models.User, *store.PaginationResult, error) {
	var users []*models.User
	q := s.db.Model(&models.User{})

	if query.Search != "" {
		like := store.LikeSearch(query.Search)
		q = q.Where("email LIKE ? OR name LIKE ?", like, like)
	}
	if query.Role != "" {
		q = q.Where("role = ?", query.Role)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&users).Error
	return users, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *userStoreService) Update(user *models.User) error {
	return s.db.Save(user).Error
}

func (s *userStoreService) Delete(id int) error {
	return s.db.Delete(&models.User{}, id).Error
}
