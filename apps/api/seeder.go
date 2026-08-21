package main

import (
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/dateutil"
)

// seed สร้างข้อมูลตั้งต้นสำหรับการพัฒนา
//
// ตั้งใจไม่ publish เอกสารกฎหมาย — สร้างเป็นฉบับร่างเปล่าไว้เท่านั้น
// เนื้อหาจริงต้องผ่านการตรวจก่อน (F-01) ห้าม seed ข้อความกฎหมายที่แต่งขึ้นเอง
func seed(db *gorm.DB, config core.Config) error {
	if err := seedAdmin(db); err != nil {
		return err
	}
	if err := seedLegalPlaceholders(db); err != nil {
		return err
	}
	return seedDemoOrg(db)
}

func seedAdmin(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		logger.Info("admin already exists, skipping")
		return nil
	}

	hash, err := request.HashPassword("changeme1234")
	if err != nil {
		return err
	}
	now := time.Now()

	admin := &models.User{
		Email:           "admin@minghe.work",
		PasswordHash:    hash,
		Name:            "ผู้ดูแลระบบ",
		Provider:        models.ProviderEmail,
		EmailVerifiedAt: &now,
		Role:            models.RoleAdmin,
		Status:          models.StatusActive,
		Locale:          "th",
	}
	if err := db.Create(admin).Error; err != nil {
		return err
	}

	logger.Warn("seeded admin admin@minghe.work / changeme1234 — เปลี่ยนรหัสผ่านทันทีหลังใช้งานครั้งแรก")
	return nil
}

// seedLegalPlaceholders สร้างเรคคอร์ดเอกสารทั้งสี่ฉบับในสถานะร่าง
// เพื่อให้ endpoint /legal ตอบได้ว่า "ยังไม่เผยแพร่" แทนที่จะเป็น 404 เปล่า ๆ
func seedLegalPlaceholders(db *gorm.DB) error {
	docs := []struct {
		slug  string
		title string
	}{
		{models.DocTerms, "เงื่อนไขการใช้งาน"},
		{models.DocPrivacy, "นโยบายความเป็นส่วนตัว (PDPA)"},
		{models.DocRefund, "นโยบายการคืนเงินและการขอลบบัญชี"},
		{models.DocCookies, "นโยบายคุกกี้"},
	}

	for _, d := range docs {
		var count int64
		if err := db.Model(&models.LegalDocument{}).Where("slug = ?", d.slug).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		doc := &models.LegalDocument{
			Slug:      d.slug,
			Version:   "0.1-draft",
			Locale:    "th",
			Title:     d.title,
			ContentMD: "> เอกสารฉบับนี้อยู่ระหว่างจัดทำ ยังไม่มีผลบังคับใช้",
			Status:    models.DocDraft,
		}
		if err := db.Create(doc).Error; err != nil {
			return err
		}
	}
	return nil
}

// seedDemoOrg สร้างองค์กรตัวอย่างพร้อมทีมสามคน ไว้ทดสอบ pairwise matrix (F-20)
func seedDemoOrg(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Organization{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		logger.Info("demo organization already exists, skipping")
		return nil
	}

	var admin models.User
	if err := db.Where("role = ?", models.RoleAdmin).First(&admin).Error; err != nil {
		return err
	}

	founding, err := dateutil.ParseDMY("14/03/2015")
	if err != nil {
		return err
	}

	org := &models.Organization{
		Name:           "บจก. ตัวอย่างโลจิสติกส์",
		RegistrationNo: "0105558000000",
		FoundingDate:   &founding,
		IndustryID:     "logistics",
		Direction:      "ตะวันออก",
		SizeBand:       "ขนาดกลาง (SME)",
		OwnerUserID:    admin.ID,
		Status:         models.StatusActive,
	}
	if err := db.Create(org).Error; err != nil {
		return err
	}
	if err := db.Create(&models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         admin.ID,
		Role:           models.OrgRoleOwner,
		Status:         models.StatusActive,
	}).Error; err != nil {
		return err
	}

	team := &models.Team{
		OrganizationID: org.ID,
		Name:           "ทีมปฏิบัติการ",
		Status:         models.StatusActive,
	}
	if err := db.Create(team).Error; err != nil {
		return err
	}

	people := []struct {
		name  string
		date  string
		time  string
		kind  string
		lead  bool
		title string
	}{
		{"สมชาย ผู้บริหาร", "13/09/1990", "15:23", models.ProfileKindExecutive, true, "กรรมการผู้จัดการ"},
		{"ปิยะ หัวหน้าทีม", "02/05/1988", "08:10", models.ProfileKindEmployee, false, "หัวหน้าคลังสินค้า"},
		{"ณัฐ พนักงาน", "27/11/1995", "21:40", models.ProfileKindEmployee, false, "เจ้าหน้าที่ปฏิบัติการ"},
	}

	for _, p := range people {
		birthDate, err := dateutil.ParseDMY(p.date)
		if err != nil {
			return err
		}

		orgID := org.ID
		profile := &models.Profile{
			OwnerUserID:    admin.ID,
			OrganizationID: &orgID,
			Kind:           p.kind,
			Name:           p.name,
			BirthDate:      birthDate,
			BirthTime:      p.time,
			BirthProvince:  "กรุงเทพมหานคร",
			ConsentSource:  models.ConsentSourceThirdParty,
			Status:         models.StatusActive,
		}
		if err := db.Create(profile).Error; err != nil {
			return err
		}
		if err := db.Create(&models.TeamMember{
			TeamID:    team.ID,
			ProfileID: profile.ID,
			Position:  p.title,
			IsLead:    p.lead,
		}).Error; err != nil {
			return err
		}
	}

	logger.Info("seeded demo organization with 1 team / 3 profiles")
	return nil
}
