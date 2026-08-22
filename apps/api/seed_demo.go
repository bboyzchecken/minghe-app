package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/dateutil"
)

// demoOrder — คำสั่งซื้อตัวอย่างที่ผูกกับบัญชีทดลอง
//
// รหัสและข้อมูลตั้งใจให้ตรงกับ SEED_ORDERS ใน apps/app/lib/api/mock-client.ts
// เพื่อให้เดโมโหมด mock และโหมด live (เครื่องเดโม) เห็นภาพเดียวกัน
// snapshot ใน input ต้องเป็นรูปแบบ GenerateReportInput ของ packages/report เพราะหน้าเว็บประกอบรายงานจากตรงนี้
type demoOrder struct {
	code          string
	customerEmail string
	product       string
	depth         string
	express       bool
	status        string
	daysAgo       int
	pin           string

	subjectName     string
	subjectGender   string
	subjectBirthDMY string // DD/MM/YYYY
	subjectBirthISO string // YYYY-MM-DD (ใช้ใน snapshot)
	subjectTime     string
	subjectProvince string

	orgMode  string
	orgLabel string
	org      map[string]any
}

func demoOrders() []demoOrder {
	return []demoOrder{
		{
			code: "PJX-K7QM-3PLA", customerEmail: "employer@demo.minghe.work",
			product: models.ProductEmployer, depth: "premium", status: models.OrderDelivered, daysAgo: 22,
			subjectName: "วีรภัทร", subjectGender: "male",
			subjectBirthDMY: "08/06/1991", subjectBirthISO: "1991-06-08", subjectTime: "09:15", subjectProvince: "กรุงเทพมหานคร",
			orgMode: models.OrgModeExecutive, orgLabel: "ผู้บริหาร (คุณบัส)",
			org: map[string]any{
				"mode": "executive", "executiveName": "คุณบัส",
				"birthDate": "1980-11-03", "birthTime": "06:30", "province": "กรุงเทพมหานคร",
				"team": []map[string]any{
					{"name": "ปิยะ หัวหน้าทีม", "birthDate": "1988-05-02", "birthTime": "08:10", "province": "กรุงเทพมหานคร"},
					{"name": "ณัฐ พนักงาน", "birthDate": "1995-11-27", "birthTime": "21:40", "province": "กรุงเทพมหานคร"},
				},
			},
		},
		{
			code: "PJX-9WDC-XR2E", customerEmail: "employer@demo.minghe.work",
			product: models.ProductEmployer, depth: "premium", express: true, status: models.OrderPaid, daysAgo: 0, pin: "1988",
			subjectName: "ปาริชาต", subjectGender: "female",
			subjectBirthDMY: "02/12/1993", subjectBirthISO: "1993-12-02", subjectTime: "17:40", subjectProvince: "เชียงใหม่",
			orgMode: models.OrgModeCompanyDate, orgLabel: "บจก. มงคลเทรด",
			org: map[string]any{"mode": "company-date", "companyName": "บจก. มงคลเทรด", "foundingDate": "2015-03-14"},
		},
		{
			code: "PJX-4HNB-QT8K", customerEmail: "hr@demo.minghe.work",
			product: models.ProductEmployer, depth: "standard", status: models.OrderPaid, daysAgo: 1,
			subjectName: "ธนกร", subjectGender: "male",
			subjectBirthDMY: "19/03/1994", subjectBirthISO: "1994-03-19", subjectTime: "11:05", subjectProvince: "ขอนแก่น",
			orgMode: models.OrgModeIndustry, orgLabel: "ธาตุอุตสาหกรรม: โลจิสติกส์",
			org: map[string]any{"mode": "industry", "industryId": "logistics", "companyName": "บจก. ตัวอย่างโลจิสติกส์"},
		},
		{
			code: "PJX-2XKD-9MRT", customerEmail: "jobseeker@demo.minghe.work",
			product: models.ProductJobSeeker, depth: "premium", status: models.OrderDelivered, daysAgo: 23,
			subjectName: "นุชนารถ", subjectGender: "female",
			subjectBirthDMY: "13/09/1990", subjectBirthISO: "1990-09-13", subjectTime: "15:23", subjectProvince: "กรุงเทพมหานคร",
			orgMode: models.OrgModeCompanyDate, orgLabel: "บมจ. รุ่งเรืองโลจิสติกส์",
			org: map[string]any{"mode": "company-date", "companyName": "บมจ. รุ่งเรืองโลจิสติกส์", "foundingDate": "2012-08-21"},
		},
	}
}

// seedDemoOrders สร้างคำสั่งซื้อตัวอย่างให้บัญชีทดลอง — idempotent (ข้ามรหัสที่มีอยู่แล้ว)
//
// ทำให้ dashboard ทั้งสองฝั่งมีประวัติ และคิวงานใน Admin Console มีงานให้ "รับเรื่อง" ได้ตั้งแต่เปิดเครื่อง
// ทุกใบมีเรคคอร์ด consent และ profile ครบเหมือนคำสั่งซื้อจริง จะได้ทดสอบโฟลว์หลังบ้านได้เต็มที่
func seedDemoOrders(db *gorm.DB) error {
	created := 0
	for _, spec := range demoOrders() {
		var existing models.Order
		err := db.Where("code = ?", spec.code).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := createDemoOrder(db, spec); err != nil {
			return err
		}
		created++
	}
	if created > 0 {
		logger.Info("สร้างคำสั่งซื้อตัวอย่าง ", created, " ใบ")
	}
	return nil
}

func createDemoOrder(db *gorm.DB, spec demoOrder) error {
	var user models.User
	if err := db.Where("email = ?", spec.customerEmail).First(&user).Error; err != nil {
		return err
	}

	// ฝั่งองค์กรผูกกับองค์กรตัวอย่าง (องค์กรแรกที่ seed ไว้) เพื่อให้ทั้งเจ้าของและ HR เห็นประวัติร่วมกัน
	var orgID *uint
	if spec.product == models.ProductEmployer {
		var org models.Organization
		if err := db.Order("id ASC").First(&org).Error; err == nil {
			orgID = &org.ID
		}
	}

	createdAt := time.Now().Add(-time.Duration(spec.daysAgo) * 24 * time.Hour)
	if spec.daysAgo == 0 {
		createdAt = time.Now().Add(-2 * time.Hour)
	}

	consent := &models.Consent{
		UserID:       &user.ID,
		Email:        user.Email,
		AcceptedDocs: "privacy:draft,refund:draft,terms:draft",
		IPAddress:    "127.0.0.1",
		UserAgent:    "seed",
		AcceptedAt:   createdAt,
	}
	if err := db.Create(consent).Error; err != nil {
		return err
	}

	birthDate, err := dateutil.ParseDMY(spec.subjectBirthDMY)
	if err != nil {
		return err
	}
	kind := models.ProfileKindCandidate
	consentSource := models.ConsentSourceThirdParty
	if spec.product == models.ProductJobSeeker {
		kind = models.ProfileKindSelf
		consentSource = models.ConsentSourceSelf
	}
	profile := &models.Profile{
		OwnerUserID:    user.ID,
		OrganizationID: orgID,
		Kind:           kind,
		Name:           spec.subjectName,
		Gender:         spec.subjectGender,
		BirthDate:      birthDate,
		BirthTime:      spec.subjectTime,
		BirthProvince:  spec.subjectProvince,
		ConsentSource:  consentSource,
		Status:         models.StatusActive,
	}
	if err := db.Create(profile).Error; err != nil {
		return err
	}

	snapshot := map[string]any{
		"report": map[string]any{
			"subject": map[string]any{
				"name":      spec.subjectName,
				"gender":    spec.subjectGender,
				"birthDate": spec.subjectBirthISO,
				"birthTime": spec.subjectTime,
				"province":  spec.subjectProvince,
			},
			"org":        spec.org,
			"targetYear": 2026,
		},
		"orgLabel": spec.orgLabel,
		"express":  spec.express,
	}
	raw, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}
	input := string(raw)

	speed := models.SpeedStandard
	if spec.express {
		speed = models.SpeedExpress
	}

	order := &models.Order{
		Code:             spec.code,
		UserID:           &user.ID,
		OrganizationID:   orgID,
		Product:          spec.product,
		Depth:            spec.depth,
		Speed:            speed,
		SubjectProfileID: &profile.ID,
		OrgMode:          spec.orgMode,
		InputJSON:        &input,
		AmountSatang:     demoPriceSatang(spec.product, spec.depth, spec.express),
		Currency:         "THB",
		Status:           spec.status,
		ConsentID:        &consent.ID,
		PaymentRef:       "SEED-" + spec.code,
		PaymentMethod:    "seed",
		PaidAt:           &createdAt,
		CreatedAt:        createdAt,
	}
	if spec.status == models.OrderDelivered {
		delivered := createdAt.Add(20 * time.Hour)
		order.DeliveredAt = &delivered
	}
	if spec.pin != "" {
		hash, err := request.HashPassword(spec.pin)
		if err != nil {
			return err
		}
		order.PinHash = hash
	}
	if err := db.Create(order).Error; err != nil {
		return err
	}
	if err := db.Model(consent).Update("order_id", order.ID).Error; err != nil {
		return err
	}

	// ใบเสร็จตัวอย่างคู่กับคำสั่งซื้อ — หน้า Bill & Payment จะได้ไม่ว่าง
	payment := &models.Payment{
		ReceiptNo:     fmt.Sprintf("RCP-%s-%04d", createdAt.Format("200601"), order.ID),
		OrderID:       order.ID,
		UserID:        &user.ID,
		CustomerName:  user.Name,
		CustomerEmail: user.Email,
		Product:       order.Product,
		Description:   "รายงานความสมพงษ์ (" + order.Code + ")",
		AmountSatang:  order.AmountSatang,
		Currency:      "THB",
		Method:        models.PayMethodSeed,
		ProviderRef:   order.PaymentRef,
		Status:        models.PaymentPaid,
		PaidAt:        createdAt,
		CreatedAt:     createdAt,
	}
	return db.Create(payment).Error
}

// demoPriceSatang ใช้ตารางราคาเดียวกับ priceSatang ใน handler (employer: standard 199 / premium 299 / executive 599 · jobseeker 199 · express +99)
func demoPriceSatang(product, depth string, express bool) int {
	baht := 199
	if product == models.ProductEmployer {
		switch depth {
		case "standard":
			baht = 199
		case "executive":
			baht = 599
		default:
			baht = 299
		}
	}
	if express {
		baht += 99
	}
	return baht * 100
}
