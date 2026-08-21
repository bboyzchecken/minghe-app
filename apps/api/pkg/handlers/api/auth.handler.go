package api

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/api/idtoken"
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/hashutil"
	"github.com/minghe/api/pkg/utils/str"
)

const (
	otpTTL           = 10 * time.Minute
	otpMaxAttempts   = 5
	otpMaxPerHour    = 5
	minPasswordChars = 8
)

type authResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

/* ── สมัครสมาชิกด้วยอีเมล ───────────────────────────────── */

type requestRegisterBody struct {
	Email string `json:"email" validate:"required,email"`
}

// RequestRegister ส่ง OTP ไปยังอีเมลเพื่อยืนยันว่าเป็นเจ้าของจริง
//
// ตอบ 200 เสมอแม้อีเมลจะถูกใช้ไปแล้ว เพื่อไม่ให้ endpoint นี้ถูกใช้ตรวจว่า
// อีเมลไหนมีบัญชีอยู่ในระบบ (account enumeration)
func (s *Server) RequestRegister(c echo.Context) error {
	var body requestRegisterBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	email := str.NormalizeEmail(body.Email)

	if _, err := s.UserStore.FindByEmail(email); err == nil {
		logger.Info("register requested for existing email: ", str.MaskEmail(email))
		return c.JSON(http.StatusOK, map[string]string{"ref": ""})
	}

	ref, err := s.issueOTP(email, models.PurposeRegister)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err(err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]string{"ref": ref})
}

type registerBody struct {
	Email     string `json:"email" validate:"required,email"`
	Code      string `json:"code" validate:"required,len=6"`
	Ref       string `json:"ref" validate:"required"`
	Password  string `json:"password" validate:"required,min=8"`
	Name      string `json:"name" validate:"required"`
	ConsentID *uint  `json:"consent_id"` // consent ที่บันทึกไว้ก่อนล็อกอิน (F-03/F-06)
}

func (s *Server) Register(c echo.Context) error {
	var body registerBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	email := str.NormalizeEmail(body.Email)
	if err := s.consumeOTP(email, models.PurposeRegister, body.Ref, body.Code); err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err(err.Error()))
	}

	hash, err := request.HashPassword(body.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot hash password"))
	}

	now := time.Now()
	user := &models.User{
		Email:           email,
		PasswordHash:    hash,
		Name:            body.Name,
		Provider:        models.ProviderEmail,
		EmailVerifiedAt: &now,
		Role:            models.RoleUser,
		Status:          models.StatusActive,
		Locale:          "th",
	}
	if err := s.UserStore.Create(user); err != nil {
		return c.JSON(http.StatusConflict, request.Err("email already registered"))
	}

	// ผูกความยินยอมที่กดไว้ตอนยังไม่มีบัญชี เข้ากับบัญชีที่เพิ่งสร้าง
	if body.ConsentID != nil {
		if err := s.ConsentStore.AttachUser(*body.ConsentID, user.ID); err != nil {
			logger.Warn("cannot attach consent to new user: ", err)
		}
	}

	token, err := s.IssueToken(user)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot issue token"))
	}
	return c.JSON(http.StatusCreated, authResponse{Token: token, User: user})
}

/* ── เข้าสู่ระบบด้วยอีเมล ───────────────────────────────── */

type loginBody struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (s *Server) Login(c echo.Context) error {
	var body loginBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	user, err := s.UserStore.FindByEmail(str.NormalizeEmail(body.Email))
	// ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด — ไม่บอกใบ้ว่าอีเมลไหนมีอยู่
	if err != nil || !request.CheckPassword(user.PasswordHash, body.Password) {
		return c.JSON(http.StatusUnauthorized, request.Err("อีเมลหรือรหัสผ่านไม่ถูกต้อง"))
	}
	if user.Status != models.StatusActive {
		return c.JSON(http.StatusForbidden, request.Err("บัญชีนี้ถูกระงับการใช้งาน"))
	}

	now := time.Now()
	user.LastLoginAt = &now
	if err := s.UserStore.Update(user); err != nil {
		logger.Warn("cannot update last_login_at: ", err)
	}

	token, err := s.IssueToken(user)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot issue token"))
	}
	return c.JSON(http.StatusOK, authResponse{Token: token, User: user})
}

/* ── เข้าสู่ระบบด้วย Google (F-02) ───────────────────────── */

type googleLoginBody struct {
	IDToken   string `json:"id_token" validate:"required"`
	ConsentID *uint  `json:"consent_id"`
}

// GoogleLogin รับ ID token จาก Google Identity Services ฝั่ง client แล้วตรวจกับ Google
//
// ใช้ ID token ไม่ใช่ authorization code เพราะฝั่งหน้าเว็บเป็น SPA
// ถ้าอีเมลตรงกับบัญชีที่สมัครด้วยรหัสผ่านไว้แล้ว จะผูก GoogleID เข้ากับบัญชีเดิม
func (s *Server) GoogleLogin(c echo.Context) error {
	var body googleLoginBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}
	if s.Config.OAuth.GoogleClientID == "" {
		return c.JSON(http.StatusNotImplemented, request.Err("google sign-in is not configured"))
	}

	payload, err := idtoken.Validate(context.Background(), body.IDToken, s.Config.OAuth.GoogleClientID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("invalid google token"))
	}

	googleID := payload.Subject
	email := str.NormalizeEmail(toString(payload.Claims["email"]))
	name := toString(payload.Claims["name"])
	picture := toString(payload.Claims["picture"])
	if email == "" {
		return c.JSON(http.StatusUnauthorized, request.Err("google account has no email"))
	}

	user, err := s.UserStore.FindByGoogleID(googleID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusInternalServerError, request.Err("cannot query user"))
		}

		// ยังไม่เคยเข้าด้วย Google — ดูว่ามีบัญชีอีเมลเดียวกันอยู่ไหม
		existing, findErr := s.UserStore.FindByEmail(email)
		if findErr == nil {
			now := time.Now()
			existing.GoogleID = googleID
			if existing.EmailVerifiedAt == nil {
				existing.EmailVerifiedAt = &now
			}
			if existing.AvatarURL == "" {
				existing.AvatarURL = picture
			}
			if err := s.UserStore.Update(existing); err != nil {
				return c.JSON(http.StatusInternalServerError, request.Err("cannot link google account"))
			}
			user = existing
		} else {
			now := time.Now()
			user = &models.User{
				Email:           email,
				Name:            str.Coalesce(name, email),
				Provider:        models.ProviderGoogle,
				GoogleID:        googleID,
				AvatarURL:       picture,
				EmailVerifiedAt: &now,
				Role:            models.RoleUser,
				Status:          models.StatusActive,
				Locale:          "th",
			}
			if err := s.UserStore.Create(user); err != nil {
				return c.JSON(http.StatusInternalServerError, request.Err("cannot create user"))
			}
		}
	}

	if user.Status != models.StatusActive {
		return c.JSON(http.StatusForbidden, request.Err("บัญชีนี้ถูกระงับการใช้งาน"))
	}

	if body.ConsentID != nil {
		if err := s.ConsentStore.AttachUser(*body.ConsentID, user.ID); err != nil {
			logger.Warn("cannot attach consent: ", err)
		}
	}

	now := time.Now()
	user.LastLoginAt = &now
	if err := s.UserStore.Update(user); err != nil {
		logger.Warn("cannot update last_login_at: ", err)
	}

	token, err := s.IssueToken(user)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot issue token"))
	}
	return c.JSON(http.StatusOK, authResponse{Token: token, User: user})
}

/* ── รีเซ็ตรหัสผ่าน ─────────────────────────────────────── */

func (s *Server) RequestResetPassword(c echo.Context) error {
	var body requestRegisterBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	email := str.NormalizeEmail(body.Email)
	if _, err := s.UserStore.FindByEmail(email); err != nil {
		// ตอบเหมือนกรณีสำเร็จ เพื่อไม่ให้ตรวจได้ว่ามีอีเมลนี้ในระบบหรือไม่
		return c.JSON(http.StatusOK, map[string]string{"ref": ""})
	}

	ref, err := s.issueOTP(email, models.PurposeResetPassword)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err(err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]string{"ref": ref})
}

type verifyResetBody struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required,len=6"`
	Ref   string `json:"ref" validate:"required"`
}

// VerifyResetPassword ตรวจ OTP โดยยังไม่ consume — ให้ผู้ใช้กรอกรหัสใหม่ต่อในหน้าถัดไป
func (s *Server) VerifyResetPassword(c echo.Context) error {
	var body verifyResetBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	email := str.NormalizeEmail(body.Email)
	code, err := s.VerificationStore.FindActive(email, models.PurposeResetPassword, body.Ref)
	if err != nil || !hashutil.EqualConstantTime(code.CodeHash, hashutil.SHA256(body.Code)) {
		return c.JSON(http.StatusUnauthorized, request.Err("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ"))
	}
	return c.JSON(http.StatusOK, map[string]bool{"valid": true})
}

type resetPasswordBody struct {
	Email    string `json:"email" validate:"required,email"`
	Code     string `json:"code" validate:"required,len=6"`
	Ref      string `json:"ref" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

func (s *Server) ResetPassword(c echo.Context) error {
	var body resetPasswordBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	email := str.NormalizeEmail(body.Email)
	if err := s.consumeOTP(email, models.PurposeResetPassword, body.Ref, body.Code); err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err(err.Error()))
	}

	user, err := s.UserStore.FindByEmail(email)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}

	hash, err := request.HashPassword(body.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot hash password"))
	}
	user.PasswordHash = hash
	if err := s.UserStore.Update(user); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update password"))
	}
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

/* ── ตัวช่วย OTP ────────────────────────────────────────── */

func (s *Server) issueOTP(email, purpose string) (string, error) {
	// กันการยิงซ้ำจนอีเมลผู้ใช้ถูกถล่ม
	count, err := s.VerificationStore.CountRecent(email, purpose, time.Now().Add(-time.Hour))
	if err != nil {
		return "", errors.New("cannot check otp quota")
	}
	if count >= otpMaxPerHour {
		return "", errors.New("ขอรหัสยืนยันบ่อยเกินไป กรุณารอสักครู่")
	}

	code, ref, err := request.GenerateOTP()
	if err != nil {
		return "", errors.New("cannot generate otp")
	}

	record := &models.VerificationCode{
		Email:     email,
		Purpose:   purpose,
		Ref:       ref,
		CodeHash:  hashutil.SHA256(code),
		ExpiresAt: time.Now().Add(otpTTL),
	}
	if err := s.VerificationStore.Create(record); err != nil {
		return "", errors.New("cannot store otp")
	}

	if err := s.Email.SendOTP(email, code, ref, purpose); err != nil {
		logger.Error("cannot send otp email: ", err)
		return "", errors.New("cannot send verification email")
	}
	return ref, nil
}

func (s *Server) consumeOTP(email, purpose, ref, code string) error {
	record, err := s.VerificationStore.FindActive(email, purpose, ref)
	if err != nil {
		return errors.New("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ")
	}
	if record.Attempts >= otpMaxAttempts {
		return errors.New("กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่")
	}

	if !hashutil.EqualConstantTime(record.CodeHash, hashutil.SHA256(code)) {
		record.Attempts++
		if err := s.VerificationStore.Update(record); err != nil {
			logger.Warn("cannot bump otp attempts: ", err)
		}
		return errors.New("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ")
	}

	now := time.Now()
	record.ConsumedAt = &now
	return s.VerificationStore.Update(record)
}

func toString(v any) string {
	s, _ := v.(string)
	return s
}
