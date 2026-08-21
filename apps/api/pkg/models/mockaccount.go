package models

// MockAccount — บัญชีทดลองที่ใช้กดเข้าระบบได้ทันทีในโหมด mock
//
// รายการนี้เป็นแหล่งความจริงเดียวของทั้งระบบ: seeder ใช้สร้างผู้ใช้จริงในฐานข้อมูล
// และ endpoint /mode ส่งรายการนี้ให้หน้าเว็บไปแสดงเป็นปุ่ม
// ฝั่งหน้าเว็บมีสำเนาไว้ใช้ตอนโหมด mock ล้วน (ไม่มี API) ที่ apps/proto/lib/api/mock-accounts.ts
// ถ้าแก้ที่นี่ ต้องแก้ไฟล์นั้นให้ตรงกันด้วย
type MockAccount struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Label    string `json:"label"`
	Detail   string `json:"detail"`
	Side     string `json:"side"` // employer | jobseeker | admin
	Role     string `json:"role"` // admin | user
	OrgRole  string `json:"org_role"`
}

// MockAccounts คือบัญชีทดลองทุกฝั่งของระบบ
//
// รหัสผ่านชุดนี้ตั้งใจให้เดาง่ายและประกาศออกไปได้ เพราะมีผลเฉพาะโหมด mock
// ในโหมด live บัญชีเหล่านี้จะไม่ถูกสร้างและ /mode จะไม่ส่งรายการออกไป
func MockAccounts() []MockAccount {
	return []MockAccount{
		{
			Email:    "employer@demo.minghe.work",
			Password: "demo1234",
			Name:     "คุณบัส (เจ้าของบริษัท)",
			Label:    "ฝั่งองค์กร — เจ้าของ",
			Detail:   "บจก. ตัวอย่างโลจิสติกส์ · เห็นทุกอย่าง จัดการทีมและสมาชิกได้",
			Side:     "employer",
			Role:     RoleUser,
			OrgRole:  OrgRoleOwner,
		},
		{
			Email:    "hr@demo.minghe.work",
			Password: "demo1234",
			Name:     "คุณแนน (ฝ่ายบุคคล)",
			Label:    "ฝั่งองค์กร — HR",
			Detail:   "บจก. ตัวอย่างโลจิสติกส์ · วิเคราะห์ candidate ได้ แต่เพิ่มสมาชิกไม่ได้",
			Side:     "employer",
			Role:     RoleUser,
			OrgRole:  OrgRoleHR,
		},
		{
			Email:    "jobseeker@demo.minghe.work",
			Password: "demo1234",
			Name:     "คุณนุช (คนหางาน)",
			Label:    "ฝั่งคนทำงาน",
			Detail:   "บัญชีบุคคลทั่วไป · เช็กความสมพงษ์กับบริษัทที่สนใจ",
			Side:     "jobseeker",
			Role:     RoleUser,
		},
		{
			Email:    "admin@minghe.work",
			Password: "changeme1234",
			Name:     "ผู้ดูแลระบบ",
			Label:    "ผู้ดูแลระบบ",
			Detail:   "จัดการคำสั่งซื้อ ผู้ใช้ และเอกสารกฎหมาย",
			Side:     "admin",
			Role:     RoleAdmin,
		},
	}
}
