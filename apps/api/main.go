package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
	"go.uber.org/fx"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/handlers/api"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/services/email"
	"github.com/minghe/api/pkg/services/storage"
	billingstore "github.com/minghe/api/pkg/store/billing"
	consentstore "github.com/minghe/api/pkg/store/consent"
	orderstore "github.com/minghe/api/pkg/store/order"
	organizationstore "github.com/minghe/api/pkg/store/organization"
	profilestore "github.com/minghe/api/pkg/store/profile"
	reportstore "github.com/minghe/api/pkg/store/report"
	userstore "github.com/minghe/api/pkg/store/user"
	verificationstore "github.com/minghe/api/pkg/store/verification"
)

// GitCommit ถูกฝังตอน build ผ่าน -ldflags
var GitCommit = "dev"

func main() {
	loadDotEnv()
	viper.AutomaticEnv()

	// ตรึง timezone ทั้ง process — ปาจือขึ้นกับเวลา จึงต้องไม่ให้ขึ้นกับ locale ของเครื่อง
	if loc, err := time.LoadLocation("Asia/Bangkok"); err == nil {
		time.Local = loc
	}

	config := loadConfig()
	logger.Setup(config.Environment)

	// โหมด CLI — รัน migration หรือ seed แล้วจบ ไม่ต้องยก server
	if len(os.Args) > 1 {
		runCommand(os.Args[1], config)
		return
	}

	app := fx.New(
		fx.Supply(config),
		fx.Provide(
			newDatabase,
			userstore.New,
			verificationstore.New,
			organizationstore.New,
			profilestore.New,
			orderstore.New,
			reportstore.New,
			consentstore.New,
			billingstore.New,
			email.New,
			storage.New,
			api.NewServer,
		),
		fx.Invoke(runMingHeAPI),
		fx.NopLogger,
	)

	app.Run()
}

// loadDotEnv อ่านไฟล์ตั้งค่าจาก root ของโปรเจกต์เป็นหลัก
//
// เจตนา: ให้มี .env ที่เดียวคือ root แล้วทั้งหน้าเว็บและ API อ่านไฟล์เดียวกัน
// ไฟล์แรกที่เจอชนะเสมอ (godotenv ไม่เขียนทับค่าที่ตั้งไว้แล้ว)
// บน production ไม่ต้องมีไฟล์ — ค่าตั้งมาจาก environment ตรง ๆ
func loadDotEnv() {
	candidates := []string{
		"../../.env", // รันด้วย go run . จาก apps/api
		"../.env",
		".env", // รันจาก root หรืออยู่ใน container
	}

	for _, path := range candidates {
		if _, err := os.Stat(path); err != nil {
			continue
		}
		if err := godotenv.Load(path); err != nil {
			logger.Warn("cannot read ", path, ": ", err)
			continue
		}
		logger.Debug("loaded config from ", path)
		return
	}
	logger.Debug("no .env file found, reading from environment")
}

func loadConfig() core.Config {
	mode := viper.GetString("MINGHE_MODE")
	if mode != core.ModeMock {
		// ค่าที่ไม่รู้จักถือเป็น live — ปลอดภัยกว่าเผลอเปิดบัญชีทดลองบนของจริง
		mode = core.ModeLive
	}

	return core.Config{
		Environment:        viper.GetString("ENV"),
		Commit:             GitCommit,
		Port:               viper.GetString("PORT"),
		AppBaseURL:         viper.GetString("APP_BASE_URL"),
		JwtSecret:          viper.GetString("JWT_SECRET_KEY"),
		Mode:               mode,
		GoogleLoginEnabled: viper.GetBool("MINGHE_GOOGLE_LOGIN_ENABLED"),
		OTPEcho:            viper.GetBool("MINGHE_OTP_ECHO"),
		SeedDemoAccounts:   viper.GetBool("MINGHE_SEED_DEMO_ACCOUNTS"),
		CORSAllowedOrigins: splitCSV(viper.GetString("CORS_ALLOWED_ORIGINS")),

		MySQL: core.MySQLConfig{
			Host:     viper.GetString("MYSQL_HOST"),
			Port:     viper.GetString("MYSQL_PORT"),
			Username: viper.GetString("MYSQL_USERNAME"),
			Password: viper.GetString("MYSQL_PASSWORD"),
			Database: viper.GetString("MYSQL_DATABASE"),
		},
		Redis: core.RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
		},
		SMTP: core.SMTPConfig{
			Host:        viper.GetString("SMTP_HOST"),
			Port:        firstNonEmpty(viper.GetString("SMTP_PORT"), "587"),
			Username:    viper.GetString("SMTP_USERNAME"),
			Password:    viper.GetString("SMTP_PASSWORD"),
			SenderEmail: viper.GetString("SMTP_SENDER_EMAIL"),
			SenderName:  firstNonEmpty(viper.GetString("SMTP_SENDER_NAME"), "命合 Mìnghé"),
		},
		GoogleAPI: core.GoogleAPIConfig{
			ClientID:     viper.GetString("GMAIL_CLIENT_ID"),
			ClientSecret: viper.GetString("GMAIL_CLIENT_SECRET"),
			RefreshToken: viper.GetString("GMAIL_REFRESH_TOKEN"),
			AccessToken:  viper.GetString("GMAIL_ACCESS_TOKEN"),
			SenderEmail:  viper.GetString("GMAIL_SENDER_EMAIL"),
		},
		OAuth: core.OAuthConfig{
			GoogleClientID:     viper.GetString("GOOGLE_OAUTH_CLIENT_ID"),
			GoogleClientSecret: viper.GetString("GOOGLE_OAUTH_CLIENT_SECRET"),
			GoogleRedirectURL:  viper.GetString("GOOGLE_OAUTH_REDIRECT_URL"),
		},
		R2: core.R2Config{
			Endpoint:    viper.GetString("R2_ENDPOINT"),
			Region:      viper.GetString("R2_REGION"),
			AccessKey:   viper.GetString("R2_ACCESS_KEY"),
			SecretKey:   viper.GetString("R2_SECRET_KEY"),
			ImageBucket: viper.GetString("R2_IMAGE_BUCKET"),
			VideoBucket: viper.GetString("R2_VIDEO_BUCKET"),
		},
		Payment: core.PaymentConfig{
			Provider:      viper.GetString("PAYMENT_PROVIDER"),
			PublicKey:     viper.GetString("PAYMENT_PUBLIC_KEY"),
			SecretKey:     viper.GetString("PAYMENT_SECRET_KEY"),
			WebhookSecret: viper.GetString("PAYMENT_WEBHOOK_SECRET"),
		},
		Legal: core.LegalConfig{
			TermsVersion:   viper.GetString("LEGAL_TERMS_VERSION"),
			PrivacyVersion: viper.GetString("LEGAL_PRIVACY_VERSION"),
			RefundVersion:  viper.GetString("LEGAL_REFUND_VERSION"),
			CookiesVersion: viper.GetString("LEGAL_COOKIES_VERSION"),
		},
	}
}

func newDatabase(config core.Config) (*gorm.DB, error) {
	level := gormlogger.Warn
	if config.Environment == "development" {
		level = gormlogger.Info
	}

	var db *gorm.DB
	var err error
	for attempt := 1; attempt <= 30; attempt++ {
		db, err = gorm.Open(mysql.Open(config.MySQL.DSN()), &gorm.Config{
			Logger: gormlogger.New(log.New(os.Stdout, "", log.LstdFlags), gormlogger.Config{
				LogLevel:                  level,
				IgnoreRecordNotFoundError: true, // seed/handler ใช้ First() เช็ก "ยังไม่มี" เป็นปกติ ไม่ใช่ error
				Colorful:                  false,
			}),
		})
		if err == nil {
			break
		}
		logger.Warn("database not ready (attempt ", attempt, "/30): ", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return nil, err
	}

	if err := runMigrations(db); err != nil {
		return nil, err
	}

	// โหมด mock: เตรียมบัญชีทดลองให้พร้อมทุกครั้งที่ start
	// จะได้สลับ MINGHE_MODE=mock แล้วกดใช้ได้เลยโดยไม่ต้องสั่ง seed เอง
	if err := ensureMockData(db, config); err != nil {
		logger.Warn("cannot prepare mock data: ", err)
	}

	return db, nil
}

func runMigrations(db *gorm.DB) error {
	m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
		{
			ID: "20260821_initial",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&models.User{},
					&models.VerificationCode{},
					&models.Organization{},
					&models.OrganizationMember{},
					&models.Team{},
					&models.TeamMember{},
					&models.Profile{},
					&models.Order{},
					&models.Report{},
					&models.Consent{},
					&models.LegalDocument{},
				)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					"legal_documents", "consents", "reports", "orders", "profiles",
					"team_members", "teams", "organization_members", "organizations",
					"verification_codes", "users",
				)
			},
		},
		{
			// google_id เดิมเป็น NOT NULL โดยปริยาย ทำให้บัญชีที่ไม่ได้ผูก Google
			// เก็บเป็นสตริงว่างและชนกันเองที่ unique index — ต้องเป็น NULL แทน
			ID: "20260822_google_id_null_when_unused",
			Migrate: func(tx *gorm.DB) error {
				if err := tx.AutoMigrate(&models.User{}); err != nil {
					return err
				}
				return tx.Exec("UPDATE users SET google_id = NULL WHERE google_id = ''").Error
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Exec("UPDATE users SET google_id = '' WHERE google_id IS NULL").Error
			},
		},
		{
			// คำเชิญเข้าองค์กร (F-05) + เขตเวลาสถานที่เกิดที่ผู้ใช้ยืนยันแล้ว (F-08)
			ID: "20260822_org_invites_and_birth_timezone",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.OrganizationInvite{}, &models.Profile{})
			},
			Rollback: func(tx *gorm.DB) error {
				if err := tx.Migrator().DropTable("organization_invites"); err != nil {
					return err
				}
				return tx.Migrator().DropColumn(&models.Profile{}, "birth_timezone_offset_hours")
			},
		},
		{
			// เพิ่มช่อง "ผู้รับเรื่อง" ให้คำสั่งซื้อ — รองรับแอดมินหลายคนทำงานพร้อมกัน
			ID: "20260822_order_assignee",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.Order{})
			},
			Rollback: func(tx *gorm.DB) error {
				if err := tx.Migrator().DropColumn(&models.Order{}, "assigned_admin_id"); err != nil {
					return err
				}
				return tx.Migrator().DropColumn(&models.Order{}, "assigned_admin_name")
			},
		},
		{
			// Bill & Payment (ใบเสร็จ + คืนเงิน), สิทธิ์ทดลองจากแอดมิน, และ funnel event สำหรับสถิติ
			ID: "20260822_billing_credits_events",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.Payment{}, &models.UserCredit{}, &models.FunnelEvent{})
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable("funnel_events", "user_credits", "payments")
			},
		},
		{
			// รหัสเข้าใช้รอบ UAT — ด่านปลดล็อกรายงานแทนเกตเวย์ชำระเงิน
			// และเพิ่มคอลัมน์ code ใน funnel_events เพื่อย้อนดูเส้นทางรายคนได้
			ID: "20260908_access_codes",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.AccessCode{}, &models.AccessCodeRedemption{}, &models.FunnelEvent{})
			},
			Rollback: func(tx *gorm.DB) error {
				if err := tx.Migrator().DropColumn(&models.FunnelEvent{}, "code"); err != nil {
					return err
				}
				return tx.Migrator().DropTable("access_code_redemptions", "access_codes")
			},
		},
	})
	return m.Migrate()
}

func runMingHeAPI(lc fx.Lifecycle, server *api.Server) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				if err := server.Start(); err != nil {
					logger.Error("server stopped: ", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("shutting down")
			return nil
		},
	})
}

func runCommand(command string, config core.Config) {
	db, err := newDatabase(config)
	if err != nil {
		logger.Error("cannot connect to database: ", err)
		os.Exit(1)
	}

	switch command {
	case "up":
		logger.Info("migrations applied")
	case "seed":
		if err := seed(db, config); err != nil {
			logger.Error("seed failed: ", err)
			os.Exit(1)
		}
		logger.Info("seed completed")
	default:
		logger.Error("unknown command: ", command)
		os.Exit(1)
	}
}

// firstNonEmpty คืนค่าแรกที่ไม่ว่าง — ใช้ตั้งค่าเริ่มต้นให้ตัวแปรที่ไม่บังคับกรอก
func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// splitCSV แยกค่าที่คั่นด้วย comma และตัดช่องว่าง — ใช้กับ CORS_ALLOWED_ORIGINS
func splitCSV(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
