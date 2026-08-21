package main

import (
	"context"
	"os"
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
	if err := godotenv.Load(".env"); err != nil {
		// ไม่ใช่ error — บน production ค่าตั้งมาจาก environment ไม่ใช่ไฟล์
		logger.Debug("no .env file found, reading from environment")
	}
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
			email.New,
			storage.New,
			api.NewServer,
		),
		fx.Invoke(runMingHeAPI),
		fx.NopLogger,
	)

	app.Run()
}

func loadConfig() core.Config {
	return core.Config{
		Environment: viper.GetString("ENV"),
		Commit:      GitCommit,
		Port:        viper.GetString("PORT"),
		AppBaseURL:  viper.GetString("APP_BASE_URL"),
		JwtSecret:   viper.GetString("JWT_SECRET_KEY"),

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

	db, err := gorm.Open(mysql.Open(config.MySQL.DSN()), &gorm.Config{
		Logger: gormlogger.Default.LogMode(level),
	})
	if err != nil {
		return nil, err
	}

	if err := runMigrations(db); err != nil {
		return nil, err
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
