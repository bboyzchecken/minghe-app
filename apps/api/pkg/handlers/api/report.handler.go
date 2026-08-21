package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
)

// reportResponse แผ่ก้อน JSON ที่เก็บไว้ใน DB ออกมาเป็นโครงสร้างจริง
// เก็บเป็น string ในตาราง แต่ส่งออกเป็น object เพื่อให้ฝั่งหน้าเว็บใช้ได้ตรง
type reportResponse struct {
	ID           uint   `json:"id"`
	OrderID      uint   `json:"order_id"`
	Version      int    `json:"version"`
	ScoreOverall int    `json:"score_overall"`
	ScoreBand    string `json:"score_band"`
	SummaryTH    string `json:"summary_th"`
	Status       string `json:"status"`

	Narrative   any `json:"narrative"`   // F-23 — ภาษาที่คนไม่รู้ปาจือเข้าใจ
	PairMatrix  any `json:"pair_matrix"` // F-20 — ความสัมพันธ์รายคู่
	Momentum    any `json:"momentum"`    // F-21/F-22 — จังหวะและ momentum
	Watchpoints any `json:"watchpoints"` // F-24 — จุดที่ควรบริหาร
	Chart       any `json:"chart"`       // F-27 — BaZi Profiling Chart

	EngineVersion string    `json:"engine_version"`
	CopyVersion   string    `json:"copy_version"`
	CreatedAt     time.Time `json:"created_at"`
}

func (s *Server) GetOrderReport(c echo.Context) error {
	order, err := s.loadOwnedOrder(c)
	if err != nil {
		return err
	}

	report, findErr := s.ReportStore.FindLatestByOrder(order.ID)
	if findErr != nil {
		return c.JSON(http.StatusNotFound, request.Err("ยังไม่มีรายงานสำหรับคำสั่งซื้อนี้"))
	}
	if report.Status != models.ReportPublished {
		return c.JSON(http.StatusAccepted, map[string]string{
			"status":  report.Status,
			"message": "รายงานกำลังอยู่ระหว่างจัดทำ",
		})
	}
	return c.JSON(http.StatusOK, toReportResponse(report))
}

type openReportBody struct {
	Code string `json:"code" validate:"required"`
	Pin  string `json:"pin"`
}

type openReportResponse struct {
	Order  orderResponse   `json:"order"`
	Report *reportResponse `json:"report"`
}

// OpenReportByCode เปิดรายงานด้วยรหัส PJX-XXXX-XXXX โดยไม่ต้องล็อกอิน
// รองรับลูกค้าที่ซื้อก่อนมีบัญชี และการส่งรายงานให้ผู้อื่นอ่าน
//
// คืน order เสมอ และคืน report เมื่อเผยแพร่แล้วเท่านั้น
// ที่ต้องคืน order ด้วยเพราะ engine ปาจืออยู่ฝั่ง client (packages/core เป็น TypeScript)
// หน้าเว็บจึงประกอบรายงานจาก snapshot ใน order ได้ทันทีระหว่างรอฉบับที่ซินแสตรวจ
func (s *Server) OpenReportByCode(c echo.Context) error {
	var body openReportBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	order, err := s.OrderStore.FindByCode(body.Code)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("ไม่พบรายงานที่ตรงกับรหัสนี้"))
	}
	if order.ExpiresAt != nil && order.ExpiresAt.Before(time.Now()) {
		return c.JSON(http.StatusGone, request.Err("รหัสนี้หมดอายุแล้ว"))
	}
	if order.PinHash != "" && !request.CheckPassword(order.PinHash, body.Pin) {
		return c.JSON(http.StatusUnauthorized, request.Err("PIN ไม่ถูกต้อง"))
	}

	res := openReportResponse{Order: toOrderResponse(order)}
	if report, findErr := s.ReportStore.FindLatestByOrder(order.ID); findErr == nil &&
		report.Status == models.ReportPublished {
		published := toReportResponse(report)
		res.Report = &published
	}
	return c.JSON(http.StatusOK, res)
}

func toReportResponse(r *models.Report) reportResponse {
	return reportResponse{
		ID:            r.ID,
		OrderID:       r.OrderID,
		Version:       r.Version,
		ScoreOverall:  r.ScoreOverall,
		ScoreBand:     r.ScoreBand,
		SummaryTH:     r.SummaryTH,
		Status:        r.Status,
		Narrative:     rawJSON(r.NarrativeJSON),
		PairMatrix:    rawJSON(r.PairMatrixJSON),
		Momentum:      rawJSON(r.MomentumJSON),
		Watchpoints:   rawJSON(r.WatchpointsJSON),
		Chart:         rawJSON(r.ChartJSON),
		EngineVersion: r.EngineVersion,
		CopyVersion:   r.CopyVersion,
		CreatedAt:     r.CreatedAt,
	}
}

// rawJSON คืน nil เมื่อยังไม่มีข้อมูล เพื่อให้ฝั่งหน้าเว็บแยกได้ว่า
// "ยังไม่ได้ทำส่วนนี้" ต่างจาก "ทำแล้วแต่ว่าง"
//
// คอลัมน์เหล่านี้เป็น NULL ได้ เพราะ MySQL ไม่ยอมรับสตริงว่างในคอลัมน์ชนิด JSON
func rawJSON(value *string) any {
	if value == nil || *value == "" {
		return nil
	}
	var out any
	if err := json.Unmarshal([]byte(*value), &out); err != nil {
		return nil
	}
	return out
}
