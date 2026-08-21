package main

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/dateutil"
)

// seed สร้างข้อมูลตั้งต้น — เรียกด้วยคำสั่ง `go run . seed`
//
// ตั้งใจไม่ publish เอกสารกฎหมาย — สร้างเป็นฉบับร่างเปล่าไว้เท่านั้น
// เนื้อหาจริงต้องผ่านการตรวจก่อน (F-01) ห้าม seed ข้อความกฎหมายที่แต่งขึ้นเอง
func seed(db *gorm.DB, config core.Config) error {
	if err := ensureUser(db, adminAccount()); err != nil {
		return err
	}
	if err := seedLegalPlaceholders(db); err != nil {
		return err
	}
	if err := seedDemoOrg(db); err != nil {
		return err
	}
	if config.IsMock() || config.SeedDemoAccounts {
		if err := ensureMockAccounts(db); err != nil {
			return err
		}
		return seedDemoOrders(db)
	}
	logger.Info("โหมด live — ข้ามการสร้างบัญชีทดลอง")
	return nil
}

// ensureMockData รันอัตโนมัติทุกครั้งที่ service เริ่มทำงานในโหมด mock
//
// จุดประสงค์คือ "สลับ MINGHE_MODE=mock แล้วใช้ได้เลย" ไม่ต้องจำว่าต้อง seed ก่อน
// ในโหมด live ฟังก์ชันนี้ไม่ทำอะไรเลย — บัญชีทดลองจะไม่ถูกสร้างเด็ดขาด
func ensureMockData(db *gorm.DB, config core.Config) error {
	if !config.IsMock() {
		return nil
	}
	if err := ensureUser(db, adminAccount()); err != nil {
		return err
	}
	if err := seedLegalPlaceholders(db); err != nil {
		return err
	}
	if err := seedDemoOrg(db); err != nil {
		return err
	}
	if err := ensureMockAccounts(db); err != nil {
		return err
	}
	return seedDemoOrders(db)
}

func adminAccount() models.MockAccount {
	for _, a := range models.MockAccounts() {
		if a.Role == models.RoleAdmin {
			return a
		}
	}
	return models.MockAccount{}
}

// ensureUser สร้างผู้ใช้ถ้ายังไม่มี และไม่แตะรหัสผ่านเดิมถ้ามีอยู่แล้ว
// (เผื่อผู้ใช้เปลี่ยนรหัสผ่านของ admin ไปแล้ว จะได้ไม่ถูกรีเซ็ตกลับทุกครั้งที่ start)
func ensureUser(db *gorm.DB, account models.MockAccount) error {
	var existing models.User
	err := db.Where("email = ?", account.Email).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	hash, hashErr := request.HashPassword(account.Password)
	if hashErr != nil {
		return hashErr
	}
	now := time.Now()

	user := &models.User{
		Email:           account.Email,
		PasswordHash:    hash,
		Name:            account.Name,
		Provider:        models.ProviderEmail,
		EmailVerifiedAt: &now,
		Role:            account.Role,
		Status:          models.StatusActive,
		Locale:          "th",
	}
	if err := db.Create(user).Error; err != nil {
		return err
	}

	if account.Role == models.RoleAdmin {
		logger.Warn("สร้างบัญชีผู้ดูแล ", account.Email, " / ", account.Password,
			" — เปลี่ยนรหัสผ่านทันทีหลังใช้งานครั้งแรก")
	} else {
		logger.Info("สร้างบัญชีทดลอง ", account.Email)
	}
	return nil
}

// ensureMockAccounts สร้างบัญชีทดลองทุกฝั่ง แล้วผูกบัญชีฝั่งองค์กรเข้ากับองค์กรตัวอย่าง
func ensureMockAccounts(db *gorm.DB) error {
	var org models.Organization
	if err := db.Order("id ASC").First(&org).Error; err != nil {
		return err
	}

	for _, account := range models.MockAccounts() {
		if err := ensureUser(db, account); err != nil {
			return err
		}
		if account.OrgRole == "" {
			continue
		}

		var user models.User
		if err := db.Where("email = ?", account.Email).First(&user).Error; err != nil {
			return err
		}

		var member models.OrganizationMember
		err := db.Where("organization_id = ? AND user_id = ?", org.ID, user.ID).First(&member).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&models.OrganizationMember{
			OrganizationID: org.ID,
			UserID:         user.ID,
			Role:           account.OrgRole,
			Status:         models.StatusActive,
		}).Error; err != nil {
			return err
		}
	}
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

	logger.Info("สร้างองค์กรตัวอย่าง 1 แห่ง · ทีม 1 ทีม · โปรไฟล์ 3 คน")
	return nil
}
