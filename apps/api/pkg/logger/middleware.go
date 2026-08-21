package logger

import (
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

			entry := log.WithFields(logrus.Fields{
				"method":   req.Method,
				"path":     req.URL.Path,
				"status":   res.Status,
				"latency":  time.Since(start).String(),
				"remote":   c.RealIP(),
				"user_id":  c.Get("id"),
				"trace_id": res.Header().Get(echo.HeaderXRequestID),
			})

			switch {
			case res.Status >= 500:
				entry.Error("request failed")
			case res.Status >= 400:
				entry.Warn("request rejected")
			default:
				entry.Info("request")
			}
			return err
		}
	}
}
