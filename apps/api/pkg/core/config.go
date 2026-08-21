package core

// Config รวมค่าตั้งทั้งหมดของ service — อ่านจาก environment ผ่าน viper ที่ main.go
type Config struct {
	Environment string
	Commit      string
	Port        string
	AppBaseURL  string // URL ของหน้าเว็บ ใช้ประกอบลิงก์ในอีเมล
	JwtSecret   string

	MySQL     MySQLConfig
	Redis     RedisConfig
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

// GoogleAPIConfig — บัญชีที่ใช้ส่งอีเมล OTP ผ่าน Gmail API
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

func (c MySQLConfig) DSN() string {
	return c.Username + ":" + c.Password + "@tcp(" + c.Host + ":" + c.Port + ")/" + c.Database +
		"?charset=utf8mb4&parseTime=True&loc=Asia%2FBangkok"
}
