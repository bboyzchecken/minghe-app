package api

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/minghe/api/pkg/handlers/api/request"
	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/utils/dateutil"
)

/* ── องค์กร (F-05) ──────────────────────────────────────── */

type organizationBody struct {
	Name           string `json:"name" validate:"required"`
	RegistrationNo string `json:"registration_no"` // เลขทะเบียนนิติบุคคลจาก DBD (F-10)
	FoundingDate   string `json:"founding_date"`   // DD/MM/YYYY เหมือนหน้าบุคคล (F-07)
	IndustryID     string `json:"industry_id"`
	Direction      string `json:"direction"`
	SizeBand       string `json:"size_band"`
}

func (s *Server) ListOrganizations(c echo.Context) error {
	query := models.ListOrganizationQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		UserID:          CurrentUserID(c),
		Search:          c.QueryParam("search"),
	}

	orgs, pagination, err := s.OrganizationStore.List(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list organizations"))
	}
	return c.JSON(http.StatusOK, request.ListResponse{Data: orgs, Pagination: pagination})
}

func (s *Server) CreateOrganization(c echo.Context) error {
	var body organizationBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	userID := CurrentUserID(c)
	org := &models.Organization{
		Name:           body.Name,
		RegistrationNo: body.RegistrationNo,
		IndustryID:     body.IndustryID,
		Direction:      body.Direction,
		SizeBand:       body.SizeBand,
		OwnerUserID:    userID,
		Status:         models.StatusActive,
	}

	if body.FoundingDate != "" {
		founding, err := dateutil.ParseDMY(body.FoundingDate)
		if err != nil {
			return c.JSON(http.StatusUnprocessableEntity,
				request.Err("รูปแบบวันก่อตั้งไม่ถูกต้อง — กรุณาระบุ วัน/เดือน/ปี เช่น 31/01/1990"))
		}
		org.FoundingDate = &founding
	}

	if err := s.OrganizationStore.Create(org); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot create organization"))
	}

	// ผู้สร้างเป็น owner โดยอัตโนมัติ ไม่งั้นจะเข้าถึงองค์กรที่เพิ่งสร้างไม่ได้
	if err := s.OrganizationStore.AddMember(&models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         userID,
		Role:           models.OrgRoleOwner,
		Status:         models.StatusActive,
	}); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot add owner membership"))
	}

	return c.JSON(http.StatusCreated, org)
}

func (s *Server) GetOrganization(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, org)
}

func (s *Server) UpdateOrganization(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}
	if !s.hasOrganizationRole(c, org.ID, models.OrgRoleOwner, models.OrgRoleHR) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}

	var body organizationBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	org.Name = body.Name
	org.RegistrationNo = body.RegistrationNo
	org.IndustryID = body.IndustryID
	org.Direction = body.Direction
	org.SizeBand = body.SizeBand

	if body.FoundingDate != "" {
		founding, parseErr := dateutil.ParseDMY(body.FoundingDate)
		if parseErr != nil {
			return c.JSON(http.StatusUnprocessableEntity,
				request.Err("รูปแบบวันก่อตั้งไม่ถูกต้อง — กรุณาระบุ วัน/เดือน/ปี เช่น 31/01/1990"))
		}
		org.FoundingDate = &founding
	}

	if err := s.OrganizationStore.Update(org); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot update organization"))
	}
	return c.JSON(http.StatusOK, org)
}

/* ── สมาชิกองค์กร ───────────────────────────────────────── */

type addMemberBody struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required,oneof=owner hr viewer"`
}

func (s *Server) ListOrganizationMembers(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}

	members, listErr := s.OrganizationStore.ListMembers(org.ID)
	if listErr != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list members"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": members})
}

func (s *Server) AddOrganizationMember(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}
	if !s.hasOrganizationRole(c, org.ID, models.OrgRoleOwner) {
		return c.JSON(http.StatusForbidden, request.Err("เฉพาะเจ้าของบัญชีองค์กรเท่านั้นที่เพิ่มสมาชิกได้"))
	}

	var body addMemberBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	user, findErr := s.UserStore.FindByEmail(body.Email)
	if findErr != nil {
		return c.JSON(http.StatusNotFound, request.Err("ยังไม่มีผู้ใช้ที่ใช้อีเมลนี้ — ให้สมัครสมาชิกก่อน"))
	}

	member := &models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         user.ID,
		Role:           body.Role,
		Status:         models.StatusActive,
	}
	if err := s.OrganizationStore.AddMember(member); err != nil {
		return c.JSON(http.StatusConflict, request.Err("ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว"))
	}
	return c.JSON(http.StatusCreated, member)
}

func (s *Server) RemoveOrganizationMember(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}
	if !s.hasOrganizationRole(c, org.ID, models.OrgRoleOwner) {
		return c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}

	userID, convErr := strconv.ParseUint(c.Param("userId"), 10, 64)
	if convErr != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid user id"))
	}
	if uint(userID) == org.OwnerUserID {
		return c.JSON(http.StatusConflict, request.Err("ลบเจ้าของบัญชีองค์กรออกไม่ได้"))
	}

	if err := s.OrganizationStore.RemoveMember(org.ID, uint(userID)); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot remove member"))
	}
	return c.NoContent(http.StatusNoContent)
}

/* ── ทีม (F-25) ─────────────────────────────────────────── */

type teamBody struct {
	Name string `json:"name" validate:"required"`
	Note string `json:"note"`
}

func (s *Server) ListTeams(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}
	teams, listErr := s.OrganizationStore.ListTeams(org.ID)
	if listErr != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list teams"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": teams})
}

func (s *Server) CreateTeam(c echo.Context) error {
	org, err := s.loadOrganization(c, "id")
	if err != nil {
		return err
	}

	var body teamBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	team := &models.Team{
		OrganizationID: org.ID,
		Name:           body.Name,
		Note:           body.Note,
		Status:         models.StatusActive,
	}
	if err := s.OrganizationStore.CreateTeam(team); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot create team"))
	}
	return c.JSON(http.StatusCreated, team)
}

type teamMemberBody struct {
	ProfileID uint   `json:"profile_id" validate:"required"`
	Position  string `json:"position"`
	IsLead    bool   `json:"is_lead"`
}

func (s *Server) ListTeamMembers(c echo.Context) error {
	team, err := s.loadTeam(c)
	if err != nil {
		return err
	}
	members, listErr := s.OrganizationStore.ListTeamMembers(team.ID)
	if listErr != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot list team members"))
	}
	return c.JSON(http.StatusOK, map[string]any{"data": members})
}

func (s *Server) AddTeamMember(c echo.Context) error {
	team, err := s.loadTeam(c)
	if err != nil {
		return err
	}

	var body teamMemberBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid request body"))
	}
	if err := c.Validate(&body); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, err)
	}

	profile, findErr := s.ProfileStore.Find(int(body.ProfileID))
	if findErr != nil {
		return c.JSON(http.StatusNotFound, request.Err("profile not found"))
	}
	// โปรไฟล์ต้องเป็นขององค์กรเดียวกัน — กันการดึงข้อมูลข้ามองค์กร
	if profile.OrganizationID == nil || *profile.OrganizationID != team.OrganizationID {
		return c.JSON(http.StatusForbidden, request.Err("โปรไฟล์นี้ไม่ได้อยู่ในองค์กรเดียวกับทีม"))
	}

	member := &models.TeamMember{
		TeamID:    team.ID,
		ProfileID: profile.ID,
		Position:  body.Position,
		IsLead:    body.IsLead,
	}
	if err := s.OrganizationStore.AddTeamMember(member); err != nil {
		return c.JSON(http.StatusConflict, request.Err("โปรไฟล์นี้อยู่ในทีมแล้ว"))
	}
	return c.JSON(http.StatusCreated, member)
}

func (s *Server) RemoveTeamMember(c echo.Context) error {
	team, err := s.loadTeam(c)
	if err != nil {
		return err
	}
	profileID, convErr := strconv.ParseUint(c.Param("profileId"), 10, 64)
	if convErr != nil {
		return c.JSON(http.StatusBadRequest, request.Err("invalid profile id"))
	}
	if err := s.OrganizationStore.RemoveTeamMember(team.ID, uint(profileID)); err != nil {
		return c.JSON(http.StatusInternalServerError, request.Err("cannot remove team member"))
	}
	return c.NoContent(http.StatusNoContent)
}

/* ── ตัวช่วยตรวจสิทธิ์ ──────────────────────────────────── */

func (s *Server) loadOrganization(c echo.Context, param string) (*models.Organization, error) {
	id, err := strconv.Atoi(c.Param(param))
	if err != nil {
		return nil, c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	org, err := s.OrganizationStore.Find(id)
	if err != nil {
		return nil, c.JSON(http.StatusNotFound, request.Err("organization not found"))
	}
	if !s.canAccessOrganization(c, org.ID) {
		return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}
	return org, nil
}

func (s *Server) loadTeam(c echo.Context) (*models.Team, error) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return nil, c.JSON(http.StatusBadRequest, request.Err("invalid id"))
	}
	team, err := s.OrganizationStore.FindTeam(id)
	if err != nil {
		return nil, c.JSON(http.StatusNotFound, request.Err("team not found"))
	}
	if !s.canAccessOrganization(c, team.OrganizationID) {
		return nil, c.JSON(http.StatusForbidden, request.Err("forbidden"))
	}
	return team, nil
}

// canAccessOrganization — ผู้ดูแลระบบเข้าได้ทุกองค์กร นอกนั้นต้องเป็นสมาชิกที่ยัง active
func (s *Server) canAccessOrganization(c echo.Context, orgID uint) bool {
	if role, _ := c.Get("role").(string); role == models.RoleAdmin {
		return true
	}
	member, err := s.OrganizationStore.FindMember(orgID, CurrentUserID(c))
	return err == nil && member.Status == models.StatusActive
}

func (s *Server) hasOrganizationRole(c echo.Context, orgID uint, roles ...string) bool {
	if role, _ := c.Get("role").(string); role == models.RoleAdmin {
		return true
	}
	member, err := s.OrganizationStore.FindMember(orgID, CurrentUserID(c))
	if err != nil || member.Status != models.StatusActive {
		return false
	}
	for _, role := range roles {
		if member.Role == role {
			return true
		}
	}
	return false
}
