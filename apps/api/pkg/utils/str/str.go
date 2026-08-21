package str

import (
	"regexp"
	"strings"
)

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// NormalizeEmail ตัดช่องว่างและแปลงเป็นตัวพิมพ์เล็ก — ใช้ก่อนบันทึกและก่อนค้นหาเสมอ
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func IsEmail(email string) bool {
	return emailRe.MatchString(NormalizeEmail(email))
}

func Truncate(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

func Coalesce(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// MaskEmail ปิดบางส่วนของอีเมลก่อนนำไปแสดงหรือใส่ log
func MaskEmail(email string) string {
	email = NormalizeEmail(email)
	at := strings.Index(email, "@")
	if at <= 1 {
		return "***"
	}
	return email[:1] + strings.Repeat("*", at-1) + email[at:]
}
