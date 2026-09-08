package billing

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
)

/*
รหัสเข้าใช้รอบ UAT — อยู่ในแพ็กเกจ billing เพราะทำหน้าที่เดียวกับการชำระเงิน
คือเป็น "ด่านปลดล็อกรายงาน" และผูกกับ FunnelEvent ที่เก็บอยู่ที่นี่อยู่แล้ว
*/

// NormalizeAccessCode ทำให้รหัสเทียบกันได้ไม่ว่าผู้ใช้จะพิมพ์มาแบบไหน
func NormalizeAccessCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func (s *billingStoreService) IssueAccessCodes(input models.IssueAccessCodesInput) ([]*models.AccessCode, error) {
	prefix := NormalizeAccessCode(input.Prefix)
	if prefix == "" {
		return nil, errors.New("ต้องระบุ prefix ของกลุ่ม")
	}
	if input.Count < 1 || input.Count > 500 {
		return nil, fmt.Errorf("จำนวนรหัสต้องอยู่ระหว่าง 1–500 — ได้รับ %d", input.Count)
	}

	// ต่อจากลำดับสูงสุดที่เคยออกให้ prefix นี้ เพื่อให้ออกเพิ่มทีหลังได้โดยไม่ชนของเดิม
	var maxSeq int
	if err := s.db.Model(&models.AccessCode{}).
		Where("prefix = ?", prefix).
		Select("COALESCE(MAX(seq), 0)").
		Scan(&maxSeq).Error; err != nil {
		return nil, err
	}

	rows := make([]*models.AccessCode, 0, input.Count)
	for i := 0; i < input.Count; i++ {
		seq := maxSeq + i + 1
		label := ""
		if i < len(input.Labels) {
			label = strings.TrimSpace(input.Labels[i])
		}
		rows = append(rows, &models.AccessCode{
			Code:        fmt.Sprintf("%s-%02d", prefix, seq),
			Prefix:      prefix,
			Seq:         seq,
			Label:       label,
			MaxUses:     input.MaxUses,
			ExpiresAt:   input.ExpiresAt,
			CreatedByID: input.CreatedBy,
		})
	}

	if err := s.db.Create(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *billingStoreService) FindAccessCode(code string) (*models.AccessCode, error) {
	var row models.AccessCode
	if err := s.db.Where("code = ?", NormalizeAccessCode(code)).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *billingStoreService) ListAccessCodes(prefix string) ([]*models.AccessCode, error) {
	var rows []*models.AccessCode
	q := s.db.Model(&models.AccessCode{})
	if p := NormalizeAccessCode(prefix); p != "" {
		q = q.Where("prefix = ?", p)
	}
	err := q.Order("prefix ASC, seq ASC").Find(&rows).Error
	return rows, err
}

/*
RedeemAccessCode — ตรวจรหัสแล้วบันทึกการใช้ในทรานแซกชันเดียว

เหตุผลที่ต้องเป็นทรานแซกชัน: ถ้าผู้ทดสอบสองคนกรอกรหัสเดียวกันพร้อมกันตอนโควตาเหลือหนึ่ง
การอ่าน-แล้ว-เขียนแบบธรรมดาจะปล่อยผ่านทั้งคู่ ใช้ UPDATE แบบมีเงื่อนไขให้ฐานข้อมูลตัดสินแทน
*/
func (s *billingStoreService) RedeemAccessCode(
	code, anonID string, userID *uint,
) (*models.AccessCode, models.AccessCodeStatus, error) {
	normalized := NormalizeAccessCode(code)
	var (
		row    models.AccessCode
		status = models.AccessCodeOK
	)

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code = ?", normalized).First(&row).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				status = models.AccessCodeNotFound
				return nil
			}
			return err
		}

		now := time.Now()
		switch {
		case row.RevokedAt != nil:
			status = models.AccessCodeRevoked
			return nil
		case row.ExpiresAt != nil && row.ExpiresAt.Before(now):
			status = models.AccessCodeExpired
			return nil
		}

		// MaxUses = 0 แปลว่าไม่จำกัด — เพิ่มตัวนับได้เสมอ
		q := tx.Model(&models.AccessCode{}).Where("id = ?", row.ID)
		if row.MaxUses > 0 {
			q = q.Where("used_count < ?", row.MaxUses)
		}
		res := q.UpdateColumn("used_count", gorm.Expr("used_count + 1"))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			status = models.AccessCodeExhausted
			return nil
		}
		row.UsedCount++

		return tx.Create(&models.AccessCodeRedemption{
			AccessCodeID: row.ID,
			Code:         row.Code,
			AnonID:       anonID,
			UserID:       userID,
		}).Error
	})
	if err != nil {
		return nil, status, err
	}
	if status != models.AccessCodeOK {
		return nil, status, nil
	}
	return &row, status, nil
}

func (s *billingStoreService) RevokeAccessCode(id uint) error {
	now := time.Now()
	return s.db.Model(&models.AccessCode{}).Where("id = ?", id).Update("revoked_at", now).Error
}

func (s *billingStoreService) EventsByCode(code string, limit int) ([]*models.FunnelEvent, error) {
	if limit <= 0 || limit > 2000 {
		limit = 500
	}
	var rows []*models.FunnelEvent
	err := s.db.Model(&models.FunnelEvent{}).
		Where("code = ?", NormalizeAccessCode(code)).
		Order("created_at ASC, id ASC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (s *billingStoreService) ListRedemptions(code string, limit int) ([]*models.AccessCodeRedemption, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	var rows []*models.AccessCodeRedemption
	q := s.db.Model(&models.AccessCodeRedemption{})
	if c := NormalizeAccessCode(code); c != "" {
		q = q.Where("code = ?", c)
	}
	err := q.Order("created_at DESC, id DESC").Limit(limit).Find(&rows).Error
	return rows, err
}
