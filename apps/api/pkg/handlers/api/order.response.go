package api

import (
	"time"

	"github.com/minghe/api/pkg/models"
)

// orderResponse คือรูปแบบที่ส่งออกทาง API
//
// ต่างจาก models.Order ตรงที่แผ่ InputJSON ออกมาเป็น object จริง
// หน้าเว็บต้องใช้ snapshot นี้ประกอบรายงานฝั่ง client (engine ปาจืออยู่ใน packages/core
// ซึ่งเป็น TypeScript — service นี้เก็บและส่งต่อข้อมูล ไม่ได้คำนวณเอง)
type orderResponse struct {
	ID   uint   `json:"id"`
	Code string `json:"code"`

	UserID         *uint `json:"user_id"`
	OrganizationID *uint `json:"organization_id"`

	Product string `json:"product"`
	Depth   string `json:"depth"`
	Speed   string `json:"speed"`

	SubjectProfileID *uint  `json:"subject_profile_id"`
	TeamID           *uint  `json:"team_id"`
	OrgMode          string `json:"org_mode"`
	Input            any    `json:"input"`

	AmountSatang int    `json:"amount_satang"`
	Currency     string `json:"currency"`
	Status       string `json:"status"`

	ConsentID *uint `json:"consent_id"`

	AssignedAdminID   *uint  `json:"assigned_admin_id"`
	AssignedAdminName string `json:"assigned_admin_name"`

	PaymentRef  string     `json:"payment_ref"`
	HasPin      bool       `json:"has_pin"`
	PaidAt      *time.Time `json:"paid_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func toOrderResponse(o *models.Order) orderResponse {
	return orderResponse{
		ID:                o.ID,
		Code:              o.Code,
		UserID:            o.UserID,
		OrganizationID:    o.OrganizationID,
		Product:           o.Product,
		Depth:             o.Depth,
		Speed:             o.Speed,
		SubjectProfileID:  o.SubjectProfileID,
		TeamID:            o.TeamID,
		OrgMode:           o.OrgMode,
		Input:             rawJSON(o.InputJSON),
		AmountSatang:      o.AmountSatang,
		Currency:          o.Currency,
		Status:            o.Status,
		ConsentID:         o.ConsentID,
		AssignedAdminID:   o.AssignedAdminID,
		AssignedAdminName: o.AssignedAdminName,
		PaymentRef:        o.PaymentRef,
		HasPin:            o.PinHash != "",
		PaidAt:            o.PaidAt,
		DeliveredAt:       o.DeliveredAt,
		ExpiresAt:         o.ExpiresAt,
		CreatedAt:         o.CreatedAt,
	}
}

func toOrderResponses(orders []*models.Order) []orderResponse {
	out := make([]orderResponse, 0, len(orders))
	for _, o := range orders {
		out = append(out, toOrderResponse(o))
	}
	return out
}
