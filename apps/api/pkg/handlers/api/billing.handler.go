package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/logger"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
	"github.com/minghe/api/pkg/store/billing"
)

/* ── ใบเสร็จ / ประวัติการชำระเงิน (ฝั่งผู้ใช้) ─────────────── */

// ListMyPayments — Bill & Payment ของบัญชีที่ล็อกอินอยู่
// ฝั่งองค์กร: รวมรายการของทั้งองค์กร (ใบเสร็จออกในนามผู้จ่าย แต่เจ้าของเห็นทั้งหมด)
func (s *Server) ListMyPayments(c echo.Context) error {
	userID := CurrentUserID(c)
	query := models.ListPaymentQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		UserID:          &userID,
	}
	query.Limit = 100

	payments, _, err := s.BillingStore.ListPayments(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list payments"))
	}

	// องค์กร: เติมรายการที่สมาชิกคนอื่นในองค์กรเดียวกันจ่าย
	if raw := c.QueryParam("organization_id"); raw != "" {
		if orgID, parseErr := strconv.ParseUint(raw, 10, 64); parseErr == nil && s.canAccessOrganization(c, uint(orgID)) {
			id := uint(orgID)
			orgOrders, _, listErr := s.OrderStore.List(models.ListOrderQuery{
				PaginationQuery: store.PaginationQuery{Limit: 100},
				OrganizationID:  &id,
			})
			if listErr == nil {
				seen := map[uint]bool{}
				for _, p := range payments {
					seen[p.OrderID] = true
				}
				for _, o := range orgOrders {
					if seen[o.ID] || o.UserID == nil || *o.UserID == userID {
						continue
					}
					more, _, _ := s.BillingStore.ListPayments(models.ListPaymentQuery{
						PaginationQuery: store.PaginationQuery{Limit: 10},
						UserID:          o.UserID,
					})
					for _, p := range more {
						if p.OrderID == o.ID {
							payments = append(payments, p)
						}
					}
				}
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]any{"data": s.withOrderCodes(payments)})
}

// ListMyCredits — สิทธิ์ทดลองที่ยังใช้ได้ของฉัน (หน้า wizard ใช้โชว์ก่อนจ่าย)
func (s *Server) ListMyCredits(c echo.Context) error {
	userID := CurrentUserID(c)
	credits, err := s.BillingStore.ListCredits(&userID, "")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list credits"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": credits})
}

/* ── funnel event (สาธารณะ — ผู้ใช้ยังไม่ล็อกอินก็ส่งได้) ───── */

type trackEventBody struct {
	AnonID    string `json:"anon_id" validate:"required,max=64"`
	Product   string `json:"product" validate:"required,oneof=employer jobseeker"`
	Step      string `json:"step" validate:"required,max=48"`
	StepIndex int    `json:"step_index"`
	// รหัสเข้าใช้รอบ UAT — ไม่บังคับ เพราะโฟลว์ปกติหลัง UAT ไม่มีรหัส
	Code string `json:"code" validate:"max=64"`
}

func (s *Server) TrackEvent(c echo.Context) error {
	var body trackEventBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	ev := &models.FunnelEvent{
		AnonID:    body.AnonID,
		Product:   body.Product,
		Step:      body.Step,
		StepIndex: body.StepIndex,
		Code:      billing.NormalizeAccessCode(body.Code),
	}
	if uid := CurrentUserID(c); uid != 0 {
		ev.UserID = &uid
	}
	if err := s.BillingStore.CreateEvent(ev); err != nil {
		// สถิติหายหนึ่งจุดไม่ควรทำให้หน้าเว็บพัง
		logger.Warn("cannot store funnel event: ", err)
	}
	return c.NoContent(http.StatusAccepted)
}

/* ── Admin: Bill & Payment ──────────────────────────────── */

type adminPaymentRow struct {
	models.Payment
	OrderCode   string `json:"order_code"`
	OrderStatus string `json:"order_status"`
}

func (s *Server) withOrderCodes(payments []*models.Payment) []adminPaymentRow {
	rows := make([]adminPaymentRow, 0, len(payments))
	cache := map[uint]*models.Order{}
	for _, p := range payments {
		row := adminPaymentRow{Payment: *p}
		o, ok := cache[p.OrderID]
		if !ok {
			if found, err := s.OrderStore.Find(int(p.OrderID)); err == nil {
				o = found
			}
			cache[p.OrderID] = o
		}
		if o != nil {
			row.OrderCode = o.Code
			row.OrderStatus = o.Status
		}
		rows = append(rows, row)
	}
	return rows
}

func (s *Server) AdminListPayments(c echo.Context) error {
	query := models.ListPaymentQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		Product:         c.QueryParam("product"),
		Status:          c.QueryParam("status"),
		Search:          c.QueryParam("search"),
	}
	payments, pagination, err := s.BillingStore.ListPayments(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list payments"))
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: s.withOrderCodes(payments), Pagination: pagination})
}

type refundBody struct {
	AmountSatang int    `json:"amount_satang"` // 0 = คืนเต็มจำนวน
	Reason       string `json:"reason" validate:"required,max=512"`
}

// AdminRefundPayment บันทึกการคืนเงิน (เต็ม/บางส่วน)
//
// ตอนนี้เป็นการบันทึกทางบัญชีเท่านั้น — การโอนเงินคืนจริงทำผ่าน gateway/โอนมือ
// เมื่อ GB Prime Pay เชื่อมเสร็จ (Q0-3) ให้เรียก refund API ตรงนี้ก่อนบันทึก
func (s *Server) AdminRefundPayment(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	var body refundBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	payment, err := s.BillingStore.FindPayment(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("payment not found"))
	}
	if payment.Status == models.PaymentRefunded {
		return c.JSON(http.StatusConflict, request.Err("รายการนี้คืนเงินเต็มจำนวนไปแล้ว"))
	}

	remaining := payment.AmountSatang - payment.RefundAmountSatang
	amount := body.AmountSatang
	if amount <= 0 || amount > remaining {
		amount = remaining
	}

	me, err := s.currentAdmin(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
	}

	now := time.Now()
	payment.RefundAmountSatang += amount
	payment.RefundReason = strings.TrimSpace(body.Reason)
	payment.RefundedByName = me.Name
	payment.RefundedAt = &now
	if payment.RefundAmountSatang >= payment.AmountSatang {
		payment.Status = models.PaymentRefunded
	} else {
		payment.Status = models.PaymentPartial
	}
	if err := s.BillingStore.UpdatePayment(payment); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot refund"))
	}

	// คืนเต็มจำนวน = คำสั่งซื้อเปลี่ยนเป็น refunded ด้วย (ปิดงาน)
	if payment.Status == models.PaymentRefunded {
		if order, findErr := s.OrderStore.Find(int(payment.OrderID)); findErr == nil {
			order.Status = models.OrderRefunded
			if err := s.OrderStore.Update(order); err != nil {
				logger.Warn("cannot mark order refunded: ", err)
			}
		}
	}

	logger.Info("refund: ", payment.ReceiptNo, " amount=", amount, " by=", me.Name)
	return c.JSON(http.StatusOK, payment)
}

/* ── Admin: สิทธิ์ทดลอง ─────────────────────────────────── */

type grantCreditBody struct {
	Product    string `json:"product" validate:"omitempty,oneof=any employer jobseeker"`
	Depth      string `json:"depth" validate:"omitempty,oneof=standard premium executive"`
	Note       string `json:"note" validate:"max=512"`
	ExpiresDay int    `json:"expires_days"` // 0 = ไม่หมดอายุ
	Quantity   int    `json:"quantity"`     // จำนวนครั้ง (1–10)
}

// AdminGrantCredit มอบสิทธิ์ใช้ฟรีให้ผู้ใช้ — ใช้กับลูกค้าที่ทักมาซื้อ/ขอลองทางไลน์
func (s *Server) AdminGrantCredit(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	var body grantCreditBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	user, err := s.UserStore.Find(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("user not found"))
	}
	me, err := s.currentAdmin(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, request.Err("unauthorized"))
	}

	qty := body.Quantity
	if qty < 1 {
		qty = 1
	}
	if qty > 10 {
		qty = 10
	}
	var expires *time.Time
	if body.ExpiresDay > 0 {
		t := time.Now().Add(time.Duration(body.ExpiresDay) * 24 * time.Hour)
		expires = &t
	}

	created := make([]*models.UserCredit, 0, qty)
	for i := 0; i < qty; i++ {
		credit := &models.UserCredit{
			UserID:        user.ID,
			Product:       orDefault(body.Product, models.CreditProductAny),
			Depth:         body.Depth,
			Note:          strings.TrimSpace(body.Note),
			GrantedByID:   me.ID,
			GrantedByName: me.Name,
			Status:        models.CreditAvailable,
			ExpiresAt:     expires,
		}
		if err := s.BillingStore.CreateCredit(credit); err != nil {
			return c.JSON(http.StatusInternalServerError, request.Err("cannot grant credit"))
		}
		created = append(created, credit)
	}

	logger.Info("credit granted: user=", user.Email, " qty=", qty, " by=", me.Name)
	return c.JSON(http.StatusCreated, map[string]any{"data": created})
}

func (s *Server) AdminListCredits(c echo.Context) error {
	var userID *uint
	if raw := c.QueryParam("user_id"); raw != "" {
		if v, err := strconv.ParseUint(raw, 10, 64); err == nil {
			id := uint(v)
			userID = &id
		}
	}
	credits, err := s.BillingStore.ListCredits(userID, c.QueryParam("status"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list credits"))
	}

	// เติมอีเมลผู้ใช้ให้หน้าแอดมินอ่านได้
	type row struct {
		models.UserCredit
		UserEmail string `json:"user_email"`
		UserName  string `json:"user_name"`
	}
	cache := map[uint]*models.User{}
	rows := make([]row, 0, len(credits))
	for _, cr := range credits {
		r := row{UserCredit: *cr}
		u, ok := cache[cr.UserID]
		if !ok {
			u, _ = s.UserStore.Find(int(cr.UserID))
			cache[cr.UserID] = u
		}
		if u != nil {
			r.UserEmail = u.Email
			r.UserName = u.Name
		}
		rows = append(rows, r)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows})
}

func (s *Server) AdminRevokeCredit(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	credit, err := s.BillingStore.FindCredit(id)
	if err != nil {
		return c.JSON(http.StatusNotFound, request.Err("credit not found"))
	}
	if credit.Status == models.CreditUsed {
		return c.JSON(http.StatusConflict, request.Err("สิทธิ์นี้ถูกใช้ไปแล้ว ยกเลิกไม่ได้"))
	}
	credit.Status = models.CreditRevoked
	if err := s.BillingStore.UpdateCredit(credit); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot revoke credit"))
	}
	return c.JSON(http.StatusOK, credit)
}

/* ── Admin: สถิติย้อนหลัง + funnel ───────────────────────── */

// AdminStats — ?granularity=day|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD
// ไม่ส่งช่วงมา: day = 30 วันล่าสุด · month = 12 เดือน · year = 5 ปี
func (s *Server) AdminStats(c echo.Context) error {
	granularity := c.QueryParam("granularity")
	if granularity != "month" && granularity != "year" {
		granularity = "day"
	}

	now := time.Now()
	to := endOfDay(now)
	var from time.Time
	switch granularity {
	case "year":
		from = time.Date(now.Year()-4, 1, 1, 0, 0, 0, 0, now.Location())
	case "month":
		from = time.Date(now.Year(), now.Month()-11, 1, 0, 0, 0, 0, now.Location())
	default:
		from = startOfDay(now.AddDate(0, 0, -29))
	}
	if raw := c.QueryParam("from"); raw != "" {
		if t, err := time.ParseInLocation("2006-01-02", raw, now.Location()); err == nil {
			from = t
		}
	}
	if raw := c.QueryParam("to"); raw != "" {
		if t, err := time.ParseInLocation("2006-01-02", raw, now.Location()); err == nil {
			to = endOfDay(t)
		}
	}

	series, err := s.BillingStore.Series(granularity, from, to)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot build stats"))
	}

	// สรุปเดือนนี้ (ไม่ขึ้นกับ granularity ที่ขอ) — การ์ดบนหัวหน้า
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	thisMonth, err := s.BillingStore.Series("month", monthStart, to)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot build stats"))
	}
	var current models.StatsBucket
	if len(thisMonth) > 0 {
		current = thisMonth[len(thisMonth)-1]
	}
	current.Key = monthStart.Format("2006-01")

	funnel, err := s.BillingStore.FunnelCounts(from, to)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot build funnel"))
	}
	dropoffs, err := s.BillingStore.Dropoffs(from, to, 50)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list dropoffs"))
	}

	return c.JSON(http.StatusOK, map[string]any{
		"granularity": granularity,
		"from":        from,
		"to":          to,
		"series":      series,
		"this_month":  current,
		"funnel":      funnel,
		"dropoffs":    dropoffs,
	})
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func endOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999_000_000, t.Location())
}

/* ── helper ที่ PayOrder ใช้ ────────────────────────────── */

// issueReceipt ออกใบเสร็จให้คำสั่งซื้อที่เพิ่งจ่าย (ลองเลขใหม่ได้ถ้าชน unique)
func (s *Server) issueReceipt(order *models.Order, user *models.User, method string, amountSatang int, now time.Time) (*models.Payment, error) {
	var last error
	for attempt := 0; attempt < 3; attempt++ {
		no, err := s.BillingStore.NextReceiptNo(now)
		if err != nil {
			return nil, err
		}
		p := &models.Payment{
			ReceiptNo:     no,
			OrderID:       order.ID,
			UserID:        order.UserID,
			CustomerName:  user.Name,
			CustomerEmail: user.Email,
			Product:       order.Product,
			Description:   describeOrder(order),
			AmountSatang:  amountSatang,
			Currency:      "THB",
			Method:        method,
			ProviderRef:   order.PaymentRef,
			Status:        models.PaymentPaid,
			PaidAt:        now,
		}
		if err := s.BillingStore.CreatePayment(p); err != nil {
			last = err
			continue
		}
		return p, nil
	}
	return nil, last
}

func describeOrder(o *models.Order) string {
	label := "รายงานความสมพงษ์"
	if o.Product == models.ProductJobSeeker {
		label = "เช็กความสมพงษ์กับบริษัท"
	}
	switch o.Depth {
	case "standard":
		label += " · Standard"
	case "executive":
		label += " · Executive"
	default:
		label += " · Premium"
	}
	if o.Speed == models.SpeedExpress {
		label += " + Express"
	}
	return label + " (" + o.Code + ")"
}
