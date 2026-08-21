package dateutil

import (
	"errors"
	"time"
)

// Bangkok คือ timezone อ้างอิงของทั้งระบบ
var Bangkok = mustLoad("Asia/Bangkok")

func mustLoad(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		return time.FixedZone("Asia/Bangkok", 7*3600)
	}
	return loc
}

var ErrInvalidDate = errors.New("invalid date format, expected DD/MM/YYYY")

// ParseDMY แปลงวันที่รูปแบบ DD/MM/YYYY (ค.ศ.) เป็น time.Time
//
// ระบบรับวันที่จากผู้ใช้เป็น วัน/เดือน/ปี เท่านั้น (F-07) — ไม่รับ MM/DD/YYYY
// เพื่อไม่ให้เกิดความกำกวมระหว่าง 01/02 กับ 02/01
func ParseDMY(value string) (time.Time, error) {
	t, err := time.ParseInLocation("02/01/2006", value, Bangkok)
	if err != nil {
		return time.Time{}, ErrInvalidDate
	}
	return t, nil
}

// FormatDMY แปลงกลับเป็นข้อความที่ผู้ใช้เห็น
func FormatDMY(t time.Time) string {
	return t.In(Bangkok).Format("02/01/2006")
}

// ParseHM แปลงเวลาเกิดรูปแบบ HH:MM
func ParseHM(value string) (hour, minute int, err error) {
	t, err := time.Parse("15:04", value)
	if err != nil {
		return 0, 0, errors.New("invalid time format, expected HH:MM")
	}
	return t.Hour(), t.Minute(), nil
}

func InTimeSpan(start, end, check time.Time) bool {
	return check.After(start) && check.Before(end)
}

func StartOfDay(t time.Time) time.Time {
	t = t.In(Bangkok)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, Bangkok)
}

func StartOfWeek(t time.Time) time.Time {
	t = StartOfDay(t)
	offset := (int(t.Weekday()) + 6) % 7 // ให้สัปดาห์เริ่มวันจันทร์
	return t.AddDate(0, 0, -offset)
}

func StartOfMonth(t time.Time) time.Time {
	t = t.In(Bangkok)
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, Bangkok)
}
