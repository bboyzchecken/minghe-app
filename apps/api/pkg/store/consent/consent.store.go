package consent

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type consentStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.ConsentStore {
	return &consentStoreService{db: db}
}

func (s *consentStoreService) Create(c *models.Consent) error {
	return s.db.Create(c).Error
}

func (s *consentStoreService) Find(id int) (*models.Consent, error) {
	var c models.Consent
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *consentStoreService) List(query models.ListConsentQuery) ([]*models.Consent, *store.PaginationResult, error) {
	var consents []*models.Consent
	q := s.db.Model(&models.Consent{})

	if query.UserID != nil {
		q = q.Where("user_id = ?", *query.UserID)
	}
	if query.Email != "" {
		q = q.Where("email = ?", query.Email)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&consents).Error
	return consents, store.NewPaginationResult(total, query.Page, query.Limit), err
}

// AttachUser ผูก consent ที่บันทึกไว้ตอนยังไม่ล็อกอิน เข้ากับบัญชีที่เพิ่งสมัคร (F-03)
func (s *consentStoreService) AttachUser(consentID, userID uint) error {
	return s.db.Model(&models.Consent{}).Where("id = ?", consentID).
		Update("user_id", userID).Error
}

func (s *consentStoreService) AttachOrder(consentID, orderID uint) error {
	return s.db.Model(&models.Consent{}).Where("id = ?", consentID).
		Update("order_id", orderID).Error
}

/* ── เอกสารกฎหมาย ───────────────────────────────────────── */

func (s *consentStoreService) UpsertDocument(doc *models.LegalDocument) error {
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "slug"}, {Name: "version"}, {Name: "locale"}},
		DoUpdates: clause.AssignmentColumns([]string{"title", "content_md", "effective_at", "status", "updated_at"}),
	}).Create(doc).Error
}

func (s *consentStoreService) FindPublishedDocument(slug, locale string) (*models.LegalDocument, error) {
	var doc models.LegalDocument
	err := s.db.
		Where("slug = ? AND locale = ? AND status = ?", slug, locale, models.DocPublished).
		Order("effective_at DESC, id DESC").
		First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *consentStoreService) ListDocuments(locale string) ([]*models.LegalDocument, error) {
	var docs []*models.LegalDocument
	q := s.db.Model(&models.LegalDocument{})
	if locale != "" {
		q = q.Where("locale = ?", locale)
	}
	err := q.Order("slug ASC, effective_at DESC").Find(&docs).Error
	return docs, err
}
