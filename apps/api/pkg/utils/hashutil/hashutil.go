package hashutil

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
)

func MD5(input string) string {
	sum := md5.Sum([]byte(input))
	return hex.EncodeToString(sum[:])
}

func SHA256(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

func HMACSign(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyHMAC เทียบลายเซ็นแบบ constant-time — ใช้กับ webhook ของ payment gateway
func VerifyHMAC(secret, data, signature string) bool {
	expected := HMACSign(secret, data)
	return subtle.ConstantTimeCompare([]byte(expected), []byte(signature)) == 1
}

// EqualConstantTime ใช้เทียบค่าที่อ่อนไหว เช่น OTP hash
func EqualConstantTime(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
