package request

import (
	"crypto/rand"
	"math/big"
	"strconv"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"github.com/minghe/api/pkg/store"
)

/* ── รหัสผ่าน ───────────────────────────────────────────── */

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

/* ── OTP ────────────────────────────────────────────────── */

const otpRefAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// GenerateOTP สร้างรหัส 6 หลักพร้อมเลขอ้างอิง 4 ตัว
// ใช้ crypto/rand ไม่ใช่ math/rand เพราะรหัสนี้ใช้ยืนยันตัวตน
func GenerateOTP() (code string, ref string, err error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", "", err
	}
	code = leftPad(strconv.FormatInt(n.Int64(), 10), 6)

	refRunes := make([]byte, 4)
	for i := range refRunes {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(otpRefAlphabet))))
		if err != nil {
			return "", "", err
		}
		refRunes[i] = otpRefAlphabet[idx.Int64()]
	}
	return code, string(refRunes), nil
}

// GenerateAccessCode สร้างรหัสเปิดรายงานรูปแบบ PJX-XXXX-XXXX
// ตัดอักษรที่สับสนออก (I, O, 0, 1) เพราะผู้ใช้ต้องพิมพ์เองจากกระดาษหรืออีเมล
func GenerateAccessCode() (string, error) {
	block := func() (string, error) {
		out := make([]byte, 4)
		for i := range out {
			idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(otpRefAlphabet))))
			if err != nil {
				return "", err
			}
			out[i] = otpRefAlphabet[idx.Int64()]
		}
		return string(out), nil
	}
	first, err := block()
	if err != nil {
		return "", err
	}
	second, err := block()
	if err != nil {
		return "", err
	}
	return "PJX-" + first + "-" + second, nil
}

func leftPad(value string, width int) string {
	for len(value) < width {
		value = "0" + value
	}
	return value
}

/* ── pagination ─────────────────────────────────────────── */

func GetPaginationQuery(c echo.Context) store.PaginationQuery {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	q := store.PaginationQuery{Page: page, Limit: limit}
	q.Normalize()
	return q
}

/* ── รูปแบบ response กลาง ───────────────────────────────── */

type ErrorResponse struct {
	Error string `json:"error"`
}

type ListResponse struct {
	Data       any                     `json:"data"`
	Pagination *store.PaginationResult `json:"pagination"`
}

func Err(message string) ErrorResponse {
	return ErrorResponse{Error: message}
}
