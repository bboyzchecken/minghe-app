package profile

import (
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type profileStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.ProfileStore {
	return &profileStoreService{db: db}
}

func (s *profileStoreService) Create(profile *models.Profile) error {
	return s.db.Create(profile).Error
}

func (s *profileStoreService) Find(id int) (*models.Profile, error) {
	var profile models.Profile
	if err := s.db.First(&profile, id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *profileStoreService) FindMany(ids []uint) ([]*models.Profile, error) {
	var profiles []*models.Profile
	if len(ids) == 0 {
		return profiles, nil
	}
	err := s.db.Where("id IN ?", ids).Find(&profiles).Error
	return profiles, err
}

func (s *profileStoreService) List(query models.ListProfileQuery) ([]*models.Profile, *store.PaginationResult, error) {
	var profiles []*models.Profile
	q := s.db.Model(&models.Profile{}).Where("status = ?", models.StatusActive)

	if query.OrganizationID != nil {
		// ข้อมูลขององค์กร — ใครก็ตามที่เป็นสมาชิกองค์กรเห็นได้ (ตรวจสิทธิ์ที่ handler)
		q = q.Where("organization_id = ?", *query.OrganizationID)
	} else if query.OwnerUserID != 0 {
		q = q.Where("owner_user_id = ? AND organization_id IS NULL", query.OwnerUserID)
	}
	if query.Kind != "" {
		q = q.Where("kind = ?", query.Kind)
	}
	if query.Search != "" {
		q = q.Where("name LIKE ?", store.LikeSearch(query.Search))
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&profiles).Error
	return profiles, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *profileStoreService) Update(profile *models.Profile) error {
	return s.db.Save(profile).Error
}

// Delete ทำเป็นการเปลี่ยนสถานะ ไม่ลบจริง — ตาม convention ของ template
// (การลบถาวรตามคำขอ PDPA มีเส้นทางแยกที่ผู้ดูแลระบบเป็นผู้ทำ)
func (s *profileStoreService) Delete(id int) error {
	return s.db.Model(&models.Profile{}).Where("id = ?", id).
		Update("status", "deleted").Error
}
