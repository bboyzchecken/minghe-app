package organization

import (
	"gorm.io/gorm"

	"github.com/minghe/api/pkg/models"
	"github.com/minghe/api/pkg/store"
)

type organizationStoreService struct {
	db *gorm.DB
}

func New(db *gorm.DB) models.OrganizationStore {
	return &organizationStoreService{db: db}
}

/* ── องค์กร ─────────────────────────────────────────────── */

func (s *organizationStoreService) Create(org *models.Organization) error {
	return s.db.Create(org).Error
}

func (s *organizationStoreService) Find(id int) (*models.Organization, error) {
	var org models.Organization
	if err := s.db.First(&org, id).Error; err != nil {
		return nil, err
	}
	return &org, nil
}

func (s *organizationStoreService) List(query models.ListOrganizationQuery) ([]*models.Organization, *store.PaginationResult, error) {
	var orgs []*models.Organization
	q := s.db.Model(&models.Organization{})

	// จำกัดเฉพาะองค์กรที่ผู้ใช้เป็นสมาชิก — กันการมองข้ามองค์กร
	if query.UserID != 0 {
		q = q.Where("id IN (?)", s.db.Model(&models.OrganizationMember{}).
			Select("organization_id").
			Where("user_id = ? AND status = ?", query.UserID, models.StatusActive))
	}
	if query.Search != "" {
		like := store.LikeSearch(query.Search)
		q = q.Where("name LIKE ? OR registration_no LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	err := store.WithPagination(q, &query.PaginationQuery).Order("id DESC").Find(&orgs).Error
	return orgs, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *organizationStoreService) Update(org *models.Organization) error {
	return s.db.Save(org).Error
}

func (s *organizationStoreService) Delete(id int) error {
	return s.db.Delete(&models.Organization{}, id).Error
}

/* ── สมาชิกองค์กร ───────────────────────────────────────── */

func (s *organizationStoreService) AddMember(member *models.OrganizationMember) error {
	return s.db.Create(member).Error
}

func (s *organizationStoreService) FindMember(orgID, userID uint) (*models.OrganizationMember, error) {
	var member models.OrganizationMember
	err := s.db.Where("organization_id = ? AND user_id = ?", orgID, userID).First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

func (s *organizationStoreService) ListMembers(orgID uint) ([]*models.OrganizationMember, error) {
	var members []*models.OrganizationMember
	err := s.db.Where("organization_id = ?", orgID).Order("id ASC").Find(&members).Error
	return members, err
}

func (s *organizationStoreService) RemoveMember(orgID, userID uint) error {
	return s.db.Where("organization_id = ? AND user_id = ?", orgID, userID).
		Delete(&models.OrganizationMember{}).Error
}

/* ── ทีม ────────────────────────────────────────────────── */

func (s *organizationStoreService) CreateTeam(team *models.Team) error {
	return s.db.Create(team).Error
}

func (s *organizationStoreService) FindTeam(id int) (*models.Team, error) {
	var team models.Team
	if err := s.db.First(&team, id).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func (s *organizationStoreService) ListTeams(orgID uint) ([]*models.Team, error) {
	var teams []*models.Team
	err := s.db.Where("organization_id = ?", orgID).Order("id DESC").Find(&teams).Error
	return teams, err
}

func (s *organizationStoreService) UpdateTeam(team *models.Team) error {
	return s.db.Save(team).Error
}

func (s *organizationStoreService) AddTeamMember(member *models.TeamMember) error {
	return s.db.Create(member).Error
}

// ListTeamMembers preload Profile มาด้วย เพราะฝั่ง report ต้องใช้ดวงของทุกคนในทีม (F-20)
func (s *organizationStoreService) ListTeamMembers(teamID uint) ([]*models.TeamMember, error) {
	var members []*models.TeamMember
	err := s.db.Preload("Profile").Where("team_id = ?", teamID).Order("id ASC").Find(&members).Error
	return members, err
}

func (s *organizationStoreService) RemoveTeamMember(teamID, profileID uint) error {
	return s.db.Where("team_id = ? AND profile_id = ?", teamID, profileID).
		Delete(&models.TeamMember{}).Error
}
