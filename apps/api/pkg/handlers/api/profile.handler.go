package api

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/dateutil"
	"github.com/minghe/api/pkg/utils/geo"
)

/* ── ระบบ memory (F-25) ─────────────────────────────────── */

type profileBody struct {
	Kind           string `json:"kind" validate:"omitempty,oneof=self candidate employee executive"`
	Name           string `json:"name" validate:"required"`
	Gender         string `json:"gender" validate:"omitempty,oneof=male female"`
	OrganizationID *uint  `json:"organization_id"`

	// รับเป็น DD/MM/YYYY เท่านั้น (F-07) — ไม่รับ ISO เพื่อให้มีรูปแบบเดียวทั้งระบบ
	BirthDate string `json:"birth_date" validate:"required"`
	BirthTime string `json:"birth_time"`

	// สถานที่เกิดเป็นลิงก์ Google Maps (F-08) — province เป็นทางสำรองเมื่อแกะลิงก์ไม่ได้
	BirthPlaceURL string `json:"birth_place_url"`
	BirthProvince string `json:"birth_province"`

	CurrentIndustryID string `json:"current_industry_id"`
	ConsentSource     string `json:"consent_source" validate:"omitempty,oneof=self third_party"`
}

func (s *Server) ListProfiles(c echo.Context) error {
	query := models.ListProfileQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		OwnerUserID:     CurrentUserID(c),
		Kind:            c.QueryParam("kind"),
		Search:          c.QueryParam("search"),
	}

	if raw := c.QueryParam("organization_id"); raw != "" {
		orgID, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return c.JSON(http.StatusBadRequest, request.Err("invalid organization_id"))
		}
		if !s.canAccessOrganization(c, uint(orgID)) {
			return c.JSON(http.StatusForbidden, request.Err("forbidden"))
		}
		id := uint(orgID)
		query.OrganizationID = &id
	}

	profiles, pagination, err := s.ProfileStore.List(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list profiles"))
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: profiles, Pagination: pagination})
}

func (s *Server) CreateProfile(c echo.Context) error {
	var body profileBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	birthDate, err := dateutil.ParseDMY(body.BirthDate)
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity,
			request.Err("รูปแบบวันเกิดไม่ถูกต้อง — กรุณาระบุ วัน/เดือน/ปี เช่น 31/01/1990"))
	}
	if body.BirthTime != "" {
		if _, _, err := dateutil.ParseHM(body.BirthTime); err != nil {
			return c.JSON(http.StatusUnprocessableEntity, request.Err("รูปแบบเวลาเกิดไม่ถูกต้อง — ต้องเป็น HH:MM"))
		}
	}

	if body.OrganizationID != nil && !s.canAccessOrganization(c, *body.OrganizationID) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}

	profile := &models.Profile{
		OwnerUserID:       CurrentUserID(c),
		OrganizationID:    body.OrganizationID,
		Kind:              orDefault(body.Kind, models.ProfileKindCandidate),
		Name:              body.Name,
		Gender:            body.Gender,
		BirthDate:         birthDate,
		BirthTime:         body.BirthTime,
		BirthProvince:     body.BirthProvince,
		CurrentIndustryID: body.CurrentIndustryID,
		ConsentSource:     orDefault(body.ConsentSource, models.ConsentSourceSelf),
		Status:            models.StatusActive,
	}

	if err := s.applyBirthPlace(profile, body.BirthPlaceURL); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, request.Err(err.Error()))
	}

	if err := s.ProfileStore.Create(profile); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot create profile"))
	}
	return c.JSON(http.StatusCreated, profile)
}

func (s *Server) GetProfile(c echo.Context) error {
	profile, err := s.loadOwnedProfile(c)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, profile)
}

func (s *Server) UpdateProfile(c echo.Context) error {
	profile, err := s.loadOwnedProfile(c)
	if err != nil {
		return err
	}

	var body profileBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	birthDate, parseErr := dateutil.ParseDMY(body.BirthDate)
	if parseErr != nil {
		return c.JSON(http.StatusUnprocessableEntity,
			request.Err("รูปแบบวันเกิดไม่ถูกต้อง — กรุณาระบุ วัน/เดือน/ปี เช่น 31/01/1990"))
	}

	profile.Name = body.Name
	profile.Gender = body.Gender
	profile.BirthDate = birthDate
	profile.BirthTime = body.BirthTime
	profile.BirthProvince = body.BirthProvince
	profile.CurrentIndustryID = body.CurrentIndustryID
	if body.Kind != "" {
		profile.Kind = body.Kind
	}

	if err := s.applyBirthPlace(profile, body.BirthPlaceURL); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, request.Err(err.Error()))
	}

	// ข้อมูลตั้งต้นเปลี่ยน — ผลคำนวณเดิมใช้ไม่ได้แล้ว
	profile.ChartJSON = nil
	profile.ComputedAt = nil

	if err := s.ProfileStore.Update(profile); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update profile"))
	}
	return c.JSON(http.StatusOK, profile)
}

func (s *Server) DeleteProfile(c echo.Context) error {
	profile, err := s.loadOwnedProfile(c)
	if err != nil {
		return err
	}
	if err := s.ProfileStore.Delete(int(profile.ID)); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot delete profile"))
	}
	return c.NoContent(http.StatusNoContent)
}

/* ── ตัวช่วย ────────────────────────────────────────────── */

// applyBirthPlace แกะพิกัดจากลิงก์ Google Maps (F-08)
//
// ลิงก์แบบย่อ (maps.app.goo.gl) ต้อง resolve redirect ฝั่ง server — ทำที่นี่ไม่ได้ที่เบราว์เซอร์
// ถ้าแกะไม่ได้จะไม่ปฏิเสธคำขอทันที แต่จะยอมรับก็ต่อเมื่อมีจังหวัดเกิดเป็นทางสำรอง
func (s *Server) applyBirthPlace(profile *models.Profile, mapsURL string) error {
	profile.BirthPlaceURL = mapsURL
	if mapsURL == "" {
		return nil
	}

	place, err := geo.ResolveGoogleMapsURL(mapsURL)
	if err != nil {
		if profile.BirthProvince == "" {
			return err
		}
		return nil
	}

	profile.BirthLat = &place.Lat
	profile.BirthLng = &place.Lng
	profile.BirthPlaceLabel = place.Label
	return nil
}

func (s *Server) loadOwnedProfile(c echo.Context) (*models.Profile, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return nil, c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}

	profile, err := s.ProfileStore.Find(id)
	if err != nil {
		return nil, c.JSON(http.StatusNotFound, request.Err("profile not found"))
	}

	// โปรไฟล์ขององค์กร → ตรวจสิทธิ์จากการเป็นสมาชิก ไม่ใช่จากผู้สร้าง
	if profile.OrganizationID != nil {
		if !s.canAccessOrganization(c, *profile.OrganizationID) {
			return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
		}
		return profile, nil
	}

	if profile.OwnerUserID != CurrentUserID(c) {
		return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}
	return profile, nil
}

func orDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
