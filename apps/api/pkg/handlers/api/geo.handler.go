package api

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/utils/geo"
)

/* ── แกะลิงก์ Google Maps เป็นพิกัด (F-08) ───────────────── */

type resolvePlaceBody struct {
	URL string `json:"url" validate:"required"`
}

type resolvePlaceResponse struct {
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	Label          string  `json:"label"`
	TimezoneOffset float64 `json:"timezone_offset_hours"`
	TimezoneRegion string  `json:"timezone_region,omitempty"`
	// TimezoneApproximate = เดาจากลองจิจูดล้วน หน้าเว็บต้องขอให้ผู้ใช้ยืนยันเขตเวลาก่อนคำนวณ
	TimezoneApproximate bool `json:"timezone_approximate"`
}

// ResolvePlace ให้ฟอร์มเรียกตอนผู้ใช้วางลิงก์ เพื่อเอาพิกัดมาให้ยืนยัน "ก่อน" คำนวณ (F-08 ข้อ 3)
//
// เป็น endpoint สาธารณะโดยตั้งใจ — ผู้ใช้กรอกฟอร์มได้ก่อนล็อกอินตามโฟลว์ trial (F-03)
// ตัว resolver กัน SSRF อยู่แล้ว (เฉพาะโดเมนของ Google และบล็อกปลายทางที่เป็น IP ภายใน)
// และ rate limiter กลางของ server คุมจำนวนคำขอต่อ IP อีกชั้น
func (s *Server) ResolvePlace(c echo.Context) error {
	var body resolvePlaceBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	place, err := geo.ResolveGoogleMapsURL(body.URL)
	if err != nil {
		// 422 ไม่ใช่ 500 — ลิงก์ที่แกะไม่ได้เป็นเรื่องปกติ หน้าเว็บจะเสนอทางสำรอง (จังหวัดเกิด)
		return c.JSON(http.StatusUnprocessableEntity, request.Err(err.Error()))
	}

	tz := geo.GuessTimezone(place.Lat, place.Lng)
	return c.JSON(http.StatusOK, resolvePlaceResponse{
		Lat:                 place.Lat,
		Lng:                 place.Lng,
		Label:               place.Label,
		TimezoneOffset:      tz.OffsetHours,
		TimezoneRegion:      tz.Region,
		TimezoneApproximate: tz.Approximate,
	})
}
