package api

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/minghe/api/pkg/core"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/services/email"
	"github.com/minghe/api/pkg/services/storage"
	"github.com/minghe/api/pkg/utils/validator"
)

type Server struct {
	Config core.Config

	UserStore         models.UserStore
	VerificationStore models.VerificationStore
	OrganizationStore models.OrganizationStore
	ProfileStore      models.ProfileStore
	OrderStore        models.OrderStore
	ReportStore       models.ReportStore
	ConsentStore      models.ConsentStore

	Email   *email.EmailService
	Storage *storage.StorageService
}

func NewServer(
	config core.Config,
	userStore models.UserStore,
	verificationStore models.VerificationStore,
	organizationStore models.OrganizationStore,
	profileStore models.ProfileStore,
	orderStore models.OrderStore,
	reportStore models.ReportStore,
	consentStore models.ConsentStore,
	emailService *email.EmailService,
	storageService *storage.StorageService,
) *Server {
	return &Server{
		Config:            config,
		UserStore:         userStore,
		VerificationStore: verificationStore,
		OrganizationStore: organizationStore,
		ProfileStore:      profileStore,
		OrderStore:        orderStore,
		ReportStore:       reportStore,
		ConsentStore:      consentStore,
		Email:             emailService,
		Storage:           storageService,
	}
}

func (s *Server) Start() error {
	e := echo.New()
	e.HideBanner = true
	e.Validator = validator.New()

	/* ── middleware กลาง ─────────────────────────────────── */
	e.Use(middleware.Recover())
	e.Use(middleware.Secure())
	e.Use(middleware.RequestID())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{s.Config.AppBaseURL, "http://localhost:3000", "http://localhost:4311"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
	}))
	e.Use(middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 20, Burst: 40, ExpiresIn: 3 * time.Minute},
		),
	}))
	e.Use(logger.Middleware())

	e.GET("/healthz", s.Health)
	e.GET("/mode", s.GetMode) // หน้าเว็บใช้ตรวจว่า API อยู่โหมด mock หรือ live

	/* ── auth (สาธารณะ) — F-02, F-03 ─────────────────────── */
	auth := e.Group("/auth")
	auth.POST("/requestRegister", s.RequestRegister)
	auth.POST("/register", s.Register)
	auth.POST("/login", s.Login)
	auth.POST("/google", s.GoogleLogin)
	auth.POST("/requestResetPassword", s.RequestResetPassword)
	auth.POST("/verifyResetPassword", s.VerifyResetPassword)
	auth.PATCH("/resetPassword", s.ResetPassword)

	/* ── เอกสารกฎหมาย (สาธารณะ) — F-01 ───────────────────── */
	// payment gateway ต้องเข้าถึงได้โดยไม่ต้องล็อกอิน
	legal := e.Group("/legal")
	legal.GET("", s.ListLegalDocuments)
	legal.GET("/:slug", s.GetLegalDocument)

	/* ── ความยินยอม — F-06 ───────────────────────────────── */
	// ใช้ OptionalJwt เพราะผู้ใช้ยอมรับเงื่อนไขได้ก่อนล็อกอิน (โฟลว์ trial)
	e.POST("/consents", s.CreateConsent, s.OptionalJwt())

	/* ── เปิดรายงานด้วยรหัส (สาธารณะ) ────────────────────── */
	e.POST("/r", s.OpenReportByCode)

	/* ── เส้นทางที่ต้องล็อกอิน ───────────────────────────── */
	api := e.Group("/api", s.JwtMiddleware())

	api.GET("/me", s.GetMe)
	api.PATCH("/me", s.UpdateMe)
	api.DELETE("/me", s.RequestAccountDeletion) // F-01 — สิทธิขอลบบัญชี

	// ระบบ memory — F-25
	api.GET("/profiles", s.ListProfiles)
	api.POST("/profiles", s.CreateProfile)
	api.GET("/profiles/:id", s.GetProfile)
	api.PATCH("/profiles/:id", s.UpdateProfile)
	api.DELETE("/profiles/:id", s.DeleteProfile)

	// องค์กร — F-05
	api.GET("/organizations", s.ListOrganizations)
	api.POST("/organizations", s.CreateOrganization)
	api.GET("/organizations/:id", s.GetOrganization)
	api.PATCH("/organizations/:id", s.UpdateOrganization)
	api.GET("/organizations/:id/members", s.ListOrganizationMembers)
	api.POST("/organizations/:id/members", s.AddOrganizationMember)
	api.DELETE("/organizations/:id/members/:userId", s.RemoveOrganizationMember)

	// team roster — F-25 ข, ป้อนข้อมูลให้ F-20
	api.GET("/organizations/:id/teams", s.ListTeams)
	api.POST("/organizations/:id/teams", s.CreateTeam)
	api.GET("/teams/:id/members", s.ListTeamMembers)
	api.POST("/teams/:id/members", s.AddTeamMember)
	api.DELETE("/teams/:id/members/:profileId", s.RemoveTeamMember)

	// คำสั่งซื้อและรายงาน
	api.GET("/orders", s.ListOrders)
	api.POST("/orders", s.CreateOrder)
	api.GET("/orders/:id", s.GetOrder)
	api.POST("/orders/:id/pay", s.PayOrder)
	api.GET("/orders/:id/report", s.GetOrderReport)

	/* ── ผู้ดูแลระบบ ─────────────────────────────────────── */
	admin := e.Group("/admin", s.JwtMiddleware(), s.IsAdmin())
	admin.GET("/users", s.AdminListUsers)
	admin.PATCH("/users/:id/status", s.AdminUpdateUserStatus)
	admin.GET("/overview", s.AdminOverview)
	admin.GET("/orders", s.AdminListOrders)
	admin.POST("/orders/:id/claim", s.AdminClaimOrder)     // รับเรื่อง (multi-admin)
	admin.DELETE("/orders/:id/claim", s.AdminReleaseOrder) // คืนงานเข้าคิว
	admin.POST("/orders/:id/process", s.AdminProcessOrder)
	admin.POST("/orders/:id/deliver", s.AdminDeliverOrder)
	admin.GET("/legal", s.AdminListLegalDocuments)
	admin.POST("/legal", s.AdminUpsertLegalDocument)

	port := s.Config.Port
	if port == "" {
		port = "5000"
	}
	logger.Info("api listening on :" + port + " · mode=" + s.Config.Mode)
	return e.Start(":" + port)
}

func (s *Server) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status":      "ok",
		"mode":        s.Config.Mode,
		"environment": s.Config.Environment,
		"commit":      s.Config.Commit,
		"time":        time.Now().Format(time.RFC3339),
	})
}
