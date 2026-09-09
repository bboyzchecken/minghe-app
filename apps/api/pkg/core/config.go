package core

// โหมดการทำงานของทั้งระบบ — ตั้งที่ MINGHE_MODE ใน .env ของ root project
const (
	// ModeMock — ใช้บัญชีทดลองที่ seed ไว้ ปุ่มบัญชีทดลองบนหน้า login เปิดให้กด
	ModeMock = "mock"
	// ModeLive — ใช้บัญชีจริงเท่านั้น ไม่ประกาศบัญชีทดลองออกไปทาง API
	ModeLive = "live"
)

// Config รวมค่าตั้งทั้งหมดของ service — อ่านจาก environment ผ่าน viper ที่ main.go
type Config struct {
	Environment string
	Commit      string
	Port        string
	AppBaseURL  string // URL ของหน้าเว็บ ใช้ประกอบลิงก์ในอีเมล
	JwtSecret   string

	// Mode คือสวิตช์ mock/live ตัวเดียวกับที่หน้าเว็บอ่าน
	Mode string
	// GoogleLoginEnabled — ตอนนี้ตั้งใจให้เป็น false: ปุ่มยังแสดงแต่กดไม่ได้ (F-02)
	GoogleLoginEnabled bool
	// OTPEcho — ส่งรหัส OTP กลับมาใน response เมื่อยังไม่ได้ตั้งค่าส่งอีเมล
	// ใช้เฉพาะสภาพแวดล้อมทดสอบ/เดโมใน LAN — บน production ต้องเป็น false เสมอ
	OTPEcho bool
	// SeedDemoAccounts — สร้างบัญชีและคำสั่งซื้อตัวอย่างแม้อยู่โหมด live (เครื่องเดโม)
	// /mode จะยังไม่ประกาศบัญชีเหล่านี้ออกไป ผู้ใช้ต้องพิมพ์เอง
	SeedDemoAccounts bool
	// CORSAllowedOrigins — origin ของหน้าเว็บที่อนุญาตเพิ่มจาก AppBaseURL และ localhost
	CORSAllowedOrigins []string

	MySQL MySQLConfig
	Redis RedisConfig
	// MailTransport — บังคับช่องทางส่งอีเมล: resend | smtp | gmail | log
	//
	// เว้นว่าง (หรือ auto) = เลือกเองตามลำดับ Resend → SMTP → Gmail API → log
	// มีไว้เพราะ .env ของ production เก็บค่าของหลายช่องทางไว้พร้อมกัน การเลือก
	// อัตโนมัติจึงเดาผิดได้ง่ายเวลาสลับ เช่นลืมล้าง SMTP_HOST แล้ว Gmail ไม่ถูกใช้
	MailTransport string

	Resend    ResendConfig
	SMTP      SMTPConfig
	GoogleAPI GoogleAPIConfig
	OAuth     OAuthConfig
	R2        R2Config
	Payment   PaymentConfig
	Legal     LegalConfig
}

type MySQLConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	Database string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

// ResendConfig — ช่องทางหลักในการส่งอีเมล OTP (ตั้งแต่ 10 ก.ย. 2569)
//
// ย้ายมาจาก SMTP เพราะ DigitalOcean บล็อกพอร์ต SMTP ขาออกทุกพอร์ตของ Droplet นี้
// (ทดสอบแล้วตันหมดทั้ง 25 / 80 / 465 / 587 / 3535) และการขอปลดล็อกต้องเปิด ticket
// รอหลายวันโดยไม่รับประกันว่าจะได้
//
// Resend ส่งผ่าน HTTPS พอร์ต 443 จึงไม่มีทางถูกบล็อกด้วยนโยบายกันสแปมแบบเดียวกัน
// ตั้ง APIKey ว่างไว้ = ไม่ใช้ช่องทางนี้ แล้วระบบจะถอยไปใช้ SMTP ตามเดิม
type ResendConfig struct {
	APIKey string
	/** ที่อยู่ผู้ส่ง — ต้องอยู่ในโดเมนที่ยืนยันแล้วใน Resend */
	SenderEmail string
	/** ชื่อที่แสดงหน้าที่อยู่ เช่น 命合 Mìnghé */
	SenderName string
}

// SMTPConfig — ช่องทางสำรองที่หนึ่ง (ใช้ไม่ได้บน Droplet ที่ถูกบล็อกพอร์ต SMTP)
//
// ย้ายจาก Gmail API มาใช้ SMTP ตรง เพราะ scope gmail.send เป็น sensitive scope
// ที่ Google บล็อกการอนุญาตทั้งหมดจนกว่าแอปจะผ่านการตรวจ ("Access blocked:
// … has not completed the Google verification process") ซึ่งใช้เวลาเป็นสัปดาห์
//
// ส่งผ่าน SMTP ของ GoDaddy ในนาม info@minghe.work ยังได้เปรียบอีกข้อ:
// SPF ของโดเมนคือ `v=spf1 include:secureserver.net -all` อยู่แล้ว จึงผ่าน SPF
// ทันทีโดยไม่ต้องแตะ DNS — ต่างจากการส่งผ่าน Google ที่ต้องเพิ่ม include ก่อน
//
// ตั้ง Host ว่างไว้ = ไม่ใช้ช่องทางนี้ แล้วระบบจะถอยไปใช้ Gmail API ตามเดิม
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	/** ที่อยู่ผู้ส่งที่แสดงในอีเมล — เว้นว่าง = ใช้ Username */
	SenderEmail string
	/** ชื่อที่แสดงหน้าที่อยู่ เช่น 命合 Mìnghé */
	SenderName string
}

// GoogleAPIConfig — บัญชีที่ใช้ส่งอีเมล OTP ผ่าน Gmail API (ช่องทางสำรอง)
type GoogleAPIConfig struct {
	ClientID     string
	ClientSecret string
	RefreshToken string
	AccessToken  string
	SenderEmail  string
}

// OAuthConfig — Sign in with Google ฝั่งผู้ใช้ (F-02) คนละชุดกับ GoogleAPIConfig
type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

type R2Config struct {
	Endpoint    string
	Region      string
	AccessKey   string
	SecretKey   string
	ImageBucket string
	VideoBucket string
}

// PaymentConfig — ผู้ให้บริการชำระเงิน (Q0-3 ยังไม่สรุปว่าเจ้าไหน จึงเก็บเป็นค่ากลาง)
type PaymentConfig struct {
	Provider      string // "omise" | "2c2p" | "stripe" | "mock"
	PublicKey     string
	SecretKey     string
	WebhookSecret string
}

// LegalConfig — เวอร์ชันเอกสารที่ถือว่ามีผลบังคับใช้ ณ ปัจจุบัน (F-01/F-06)
// ใช้ตอนบันทึก consent เพื่อให้รู้ว่าผู้ใช้ยอมรับเอกสารเวอร์ชันไหน
type LegalConfig struct {
	TermsVersion   string
	PrivacyVersion string
	RefundVersion  string
	CookiesVersion string
}

// IsMock บอกว่า service กำลังทำงานในโหมดสาธิตหรือไม่
// ค่าที่ไม่รู้จักถือเป็น live เสมอ — ปลอดภัยกว่าเผลอเปิดบัญชีทดลองบนของจริง
func (c Config) IsMock() bool { return c.Mode == ModeMock }

func (c MySQLConfig) DSN() string {
	return c.Username + ":" + c.Password + "@tcp(" + c.Host + ":" + c.Port + ")/" + c.Database +
		"?charset=utf8mb4&parseTime=True&loc=Asia%2FBangkok"
}
