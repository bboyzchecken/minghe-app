package billing

import (
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type billingStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.BillingStore {
	return &billingStoreService{db: db}
}

/* ── การชำระเงิน ────────────────────────────────────────── */

func (s *billingStoreService) CreatePayment(p *models.Payment) error {
	return s.db.Create(p).Error
}

func (s *billingStoreService) FindPayment(id int) (*models.Payment, error) {
	var p models.Payment
	if err := s.db.First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *billingStoreService) ListPayments(query models.ListPaymentQuery) ([]*models.Payment, *store.PaginationResult, error) {
	var rows []*models.Payment
	q := s.db.Model(&models.Payment{})

	if query.UserID != nil {
		q = q.Where("user_id = ?", *query.UserID)
	}
	if query.Product != "" {
		q = q.Where("product = ?", query.Product)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Search != "" {
		like := store.LikeSearch(query.Search)
		q = q.Where("receipt_no LIKE ? OR customer_email LIKE ? OR provider_ref LIKE ?", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}
	err := store.WithPagination(q, &query.PaginationQuery).Order("paid_at DESC, id DESC").Find(&rows).Error
	return rows, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *billingStoreService) UpdatePayment(p *models.Payment) error {
	return s.db.Save(p).Error
}

// NextReceiptNo — RCP-YYYYMM-#### นับใหม่ทุกเดือน
// ไม่ล็อกตาราง: ชนกันได้เฉพาะกรณีสองคำสั่งซื้อจ่ายพร้อมกันในมิลลิวินาทีเดียวกัน
// ซึ่ง uniqueIndex จะปฏิเสธและ handler ลองใหม่ได้
func (s *billingStoreService) NextReceiptNo(now time.Time) (string, error) {
	prefix := "RCP-" + now.Format("200601") + "-"
	var count int64
	if err := s.db.Model(&models.Payment{}).
		Where("receipt_no LIKE ?", prefix+"%").
		Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}

/* ── สิทธิ์ทดลอง ────────────────────────────────────────── */

func (s *billingStoreService) CreateCredit(c *models.UserCredit) error {
	return s.db.Create(c).Error
}

func (s *billingStoreService) FindCredit(id int) (*models.UserCredit, error) {
	var c models.UserCredit
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *billingStoreService) ListCredits(userID *uint, status string) ([]*models.UserCredit, error) {
	var rows []*models.UserCredit
	q := s.db.Model(&models.UserCredit{})
	if userID != nil {
		q = q.Where("user_id = ?", *userID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("id DESC").Limit(500).Find(&rows).Error
	return rows, err
}

func (s *billingStoreService) UpdateCredit(c *models.UserCredit) error {
	return s.db.Save(c).Error
}

/* ── funnel ─────────────────────────────────────────────── */

func (s *billingStoreService) CreateEvent(e *models.FunnelEvent) error {
	return s.db.Create(e).Error
}

func (s *billingStoreService) FunnelCounts(from, to time.Time) ([]models.FunnelStepCount, error) {
	var rows []models.FunnelStepCount
	err := s.db.Model(&models.FunnelEvent{}).
		Select("product, step, MAX(step_index) AS `index`, COUNT(DISTINCT anon_id) AS count").
		Where("created_at BETWEEN ? AND ?", from, to).
		Group("product, step").
		Order("product, `index`").
		Scan(&rows).Error
	return rows, err
}

// Dropoffs — หา anon_id ที่มี event ในช่วงเวลาแต่ไม่มี "paid" แล้วดึงขั้นสุดท้ายที่ไปถึง
func (s *billingStoreService) Dropoffs(from, to time.Time, limit int) ([]models.DropoffUser, error) {
	type agg struct {
		AnonID    string
		Product   string
		UserID    *uint
		LastIndex int
		LastSeen  time.Time
		FirstAt   time.Time
	}
	var aggs []agg
	err := s.db.Model(&models.FunnelEvent{}).
		Select("anon_id, product, MAX(user_id) AS user_id, MAX(step_index) AS last_index, MAX(created_at) AS last_seen, MIN(created_at) AS first_at").
		Where("created_at BETWEEN ? AND ?", from, to).
		Group("anon_id, product").
		Having("SUM(step = 'paid') = 0").
		Order("last_seen DESC").
		Limit(limit).
		Scan(&aggs).Error
	if err != nil {
		return nil, err
	}

	out := make([]models.DropoffUser, 0, len(aggs))
	for _, a := range aggs {
		row := models.DropoffUser{
			AnonID:     a.AnonID,
			UserID:     a.UserID,
			Product:    a.Product,
			LastIndex:  a.LastIndex,
			LastSeenAt: a.LastSeen,
			FirstAt:    a.FirstAt,
		}
		// ชื่อขั้นสุดท้าย
		var ev models.FunnelEvent
		if err := s.db.Where("anon_id = ? AND product = ? AND step_index = ?", a.AnonID, a.Product, a.LastIndex).
			Order("created_at DESC").First(&ev).Error; err == nil {
			row.LastStep = ev.Step
		}
		if a.UserID != nil {
			var u models.User
			if err := s.db.Select("id, email, name").First(&u, *a.UserID).Error; err == nil {
				row.Email = u.Email
				row.Name = u.Name
			}
			var credit models.UserCredit
			if err := s.db.Where("user_id = ? AND status = ?", *a.UserID, models.CreditAvailable).
				Order("id DESC").First(&credit).Error; err == nil {
				row.HasCredit = true
				row.GrantedAt = &credit.CreatedAt
			}
		}
		out = append(out, row)
	}
	return out, nil
}

/* ── สถิติย้อนหลัง ──────────────────────────────────────── */

func dateFormat(granularity string) string {
	switch granularity {
	case "year":
		return "%Y"
	case "month":
		return "%Y-%m"
	default:
		return "%Y-%m-%d"
	}
}

func (s *billingStoreService) Series(granularity string, from, to time.Time) ([]models.StatsBucket, error) {
	fmtStr := dateFormat(granularity)
	buckets := map[string]*models.StatsBucket{}
	get := func(key string) *models.StatsBucket {
		if b, ok := buckets[key]; ok {
			return b
		}
		b := &models.StatsBucket{Key: key}
		buckets[key] = b
		return b
	}

	// 1) รายได้จาก payments — นับเฉพาะที่ยังไม่ถูกคืนทั้งหมด · การคืนแยกคอลัมน์
	var pays []struct {
		K       string
		Product string
		Amount  int64
		Refund  int64
		Count   int64
	}
	if err := s.db.Model(&models.Payment{}).
		Select("DATE_FORMAT(paid_at, ?) AS k, product, SUM(amount_satang - refund_amount_satang) AS amount, SUM(refund_amount_satang) AS refund, COUNT(*) AS count", fmtStr).
		Where("paid_at BETWEEN ? AND ?", from, to).
		Group("k, product").Scan(&pays).Error; err != nil {
		return nil, err
	}
	for _, p := range pays {
		b := get(p.K)
		if p.Product == models.ProductJobSeeker {
			b.RevenueJobseekerSatang += p.Amount
		} else {
			b.RevenueEmployerSatang += p.Amount
		}
		b.RefundSatang += p.Refund
		b.PaymentsCount += p.Count
	}

	// 2) คำสั่งซื้อที่จ่ายแล้ว (นับงาน ไม่ใช่เงิน)
	var orders []struct {
		K       string
		Product string
		Count   int64
	}
	if err := s.db.Model(&models.Order{}).
		Select("DATE_FORMAT(paid_at, ?) AS k, product, COUNT(*) AS count", fmtStr).
		Where("paid_at BETWEEN ? AND ? AND status IN ?", from, to,
			[]string{models.OrderPaid, models.OrderProcessing, models.OrderDelivered, models.OrderRefunded}).
		Group("k, product").Scan(&orders).Error; err != nil {
		return nil, err
	}
	for _, o := range orders {
		b := get(o.K)
		if o.Product == models.ProductJobSeeker {
			b.OrdersJobseeker += o.Count
		} else {
			b.OrdersEmployer += o.Count
		}
	}

	// 3) สมัครใหม่
	var signups []struct {
		K     string
		Count int64
	}
	if err := s.db.Model(&models.User{}).
		Select("DATE_FORMAT(created_at, ?) AS k, COUNT(*) AS count", fmtStr).
		Where("created_at BETWEEN ? AND ? AND role = ?", from, to, models.RoleUser).
		Group("k").Scan(&signups).Error; err != nil {
		return nil, err
	}
	for _, r := range signups {
		get(r.K).Signups += r.Count
	}

	// 4) คนเริ่มลอง vs คนจ่าย (distinct anon)
	var trials []struct {
		K       string
		Started int64
		Paid    int64
	}
	if err := s.db.Model(&models.FunnelEvent{}).
		Select("DATE_FORMAT(created_at, ?) AS k, COUNT(DISTINCT CASE WHEN step = 'wizard_start' THEN anon_id END) AS started, COUNT(DISTINCT CASE WHEN step = 'paid' THEN anon_id END) AS paid", fmtStr).
		Where("created_at BETWEEN ? AND ?", from, to).
		Group("k").Scan(&trials).Error; err != nil {
		return nil, err
	}
	for _, t := range trials {
		b := get(t.K)
		b.TrialsStarted += t.Started
		b.TrialsPaid += t.Paid
	}

	out := make([]models.StatsBucket, 0, len(buckets))
	for _, b := range buckets {
		out = append(out, *b)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out, nil
}
