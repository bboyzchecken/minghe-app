package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
)

// TokenTTL — อายุ token 7 วัน ตาม convention ของ template
const TokenTTL = 7 * 24 * time.Hour

type Claims struct {
	ID    uint   `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func (s *Server) IssueToken(user *models.User) (string, error) {
	claims := Claims{
		ID:    user.ID,
		Email: user.Email,
		Role:  user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(user.ID), 10),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.Config.JwtSecret))
}

func (s *Server) parseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.Config.JwtSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func extractBearerToken(c echo.Context) string {
	header := c.Request().Header.Get(echo.HeaderAuthorization)
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// JwtMiddleware บังคับให้ต้องล็อกอิน
//
// ตรวจสถานะบัญชีจากฐานข้อมูลทุกครั้ง ไม่เชื่อ role/status ที่อยู่ใน token
// เพื่อให้การระงับบัญชีมีผลทันทีระหว่าง session ไม่ต้องรอ token หมดอายุ
func (s *Server) JwtMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims, err := s.parseToken(extractBearerToken(c))
			if err != nil {
				return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
			}

			user, err := s.UserStore.Find(int(claims.ID))
			if err != nil || user.Status != models.StatusActive {
				return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
			}

			c.Set("id", int(user.ID))
			c.Set("email", user.Email)
			c.Set("role", user.Role)
			return next(c)
		}
	}
}

// IsAdmin ต้องใช้ต่อจาก JwtMiddleware เสมอ
func (s *Server) IsAdmin() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get("role").(string)
			if role != models.RoleAdmin {
				return c.JSON(http.StatusForbidden, request.Err("forbidden"))
			}
			return next(c)
		}
	}
}

// OptionalJwt ใช้กับเส้นทางที่เปิดสาธารณะแต่ให้ผลต่างกันเมื่อล็อกอิน
//
// จำเป็นสำหรับโฟลว์ trial (F-03): ผู้ใช้กรอกฟอร์มและบันทึกความยินยอมได้ก่อนล็อกอิน
// แต่ถ้าล็อกอินอยู่แล้วต้องผูกข้อมูลเข้ากับบัญชีทันที
func (s *Server) OptionalJwt() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := extractBearerToken(c)
			if token == "" {
				return next(c)
			}
			claims, err := s.parseToken(token)
			if err != nil {
				return next(c)
			}
			user, err := s.UserStore.Find(int(claims.ID))
			if err != nil || user.Status != models.StatusActive {
				return next(c)
			}
			c.Set("id", int(user.ID))
			c.Set("email", user.Email)
			c.Set("role", user.Role)
			return next(c)
		}
	}
}

/* ── helper สำหรับ handler ──────────────────────────────── */

// CurrentUserID คืน 0 เมื่อยังไม่ล็อกอิน (เป็นไปได้เฉพาะเส้นทางที่ใช้ OptionalJwt)
func CurrentUserID(c echo.Context) uint {
	id, ok := c.Get("id").(int)
	if !ok {
		return 0
	}
	return uint(id)
}
