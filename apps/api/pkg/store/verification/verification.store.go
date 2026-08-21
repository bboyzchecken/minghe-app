package verification

import (
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
)

type verificationStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.VerificationStore {
	return &verificationStoreService{db: db}
}

func (s *verificationStoreService) Create(code *models.VerificationCode) error {
	return s.db.Create(code).Error
}

// FindActive คืนรหัสที่ยังไม่ถูกใช้และยังไม่หมดอายุ
func (s *verificationStoreService) FindActive(email, purpose, ref string) (*models.VerificationCode, error) {
	var code models.VerificationCode
	err := s.db.
		Where("email = ? AND purpose = ? AND ref = ?", email, purpose, ref).
		Where("consumed_at IS NULL AND expires_at > ?", time.Now()).
		Order("id DESC").
		First(&code).Error
	if err != nil {
		return nil, err
	}
	return &code, nil
}

func (s *verificationStoreService) Update(code *models.VerificationCode) error {
	return s.db.Save(code).Error
}

func (s *verificationStoreService) CountRecent(email, purpose string, since time.Time) (int64, error) {
	var total int64
	err := s.db.Model(&models.VerificationCode{}).
		Where("email = ? AND purpose = ? AND created_at > ?", email, purpose, since).
		Count(&total).Error
	return total, err
}

func (s *verificationStoreService) DeleteExpired(before time.Time) error {
	return s.db.Where("expires_at < ?", before).Delete(&models.VerificationCode{}).Error
}
