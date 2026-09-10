package logger

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

// Middleware บันทึกทุก request พร้อมเวลาที่ใช้
// ไม่บันทึก body เพราะฟอร์มมีวัน–เวลาเกิด ซึ่งเป็นข้อมูลส่วนบุคคลตาม PDPA
func Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)

			req := c.Request()
			res := c.Response()

			// echo เรียก HTTPErrorHandler หลัง middleware ทุกชั้นคืนค่าแล้ว ตอนนี้ res.Status
			// จึงยังเป็น 200 ตามค่าเริ่มต้นเสมอ — ถ้าอ่านตรง ๆ log จะรายงาน 404/401/500
			// เป็น 200 หมด (เคยทำให้เข้าใจผิดว่า API ตอบไฟล์ .env ที่บอตมาสแกนจริง)
			status := res.Status
			if err != nil && !res.Committed {
				if httpErr, ok := err.(*echo.HTTPError); ok {
					status = httpErr.Code
				} else {
					status = http.StatusInternalServerError
				}
			}

			entry := log.WithFields(logrus.Fields{
				"method":   req.Method,
				"path":     req.URL.Path,
				"status":   status,
				"latency":  time.Since(start).String(),
				"remote":   c.RealIP(),
				"user_id":  c.Get("id"),
				"trace_id": res.Header().Get(echo.HeaderXRequestID),
			})

			switch {
			case status >= 500:
				entry.Error("request failed")
			case status >= 400:
				entry.Warn("request rejected")
			default:
				entry.Info("request")
			}
			return err
		}
	}
}
