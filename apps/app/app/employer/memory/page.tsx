'use client'

/**
 * คลังข้อมูลองค์กร — Profile Memory + Team Roster (F-25 ข้อ ก และ ข)
 *
 * นิยามที่ใช้: "memory" = ของสามอย่างที่ไม่ควรต้องกรอกซ้ำ
 *   ก. โปรไฟล์คน (ผู้บริหาร / พนักงาน / candidate ที่เคยวิเคราะห์)
 *   ข. ทีม — ชุดพนักงานที่ประกอบไว้ล่วงหน้า ดึงเข้า wizard ได้ทั้งชุด
 *   ค. ประวัติรายงาน — อยู่ที่ dashboard อยู่แล้ว จึงไม่ทำซ้ำที่นี่
 *
 * ข้อมูลเป็นของ "องค์กร" ไม่ใช่ของคนกรอก — HR ลาออกแล้วข้อมูลยังอยู่กับบริษัท
 *
 * PDPA: หน้านี้เก็บวันเกิดของบุคคลที่สาม จึงต้องมีปุ่มลบรายคนที่ใช้ได้จริง
 * และต้องบอกให้ชัดว่าเก็บอะไรไว้ ไม่ใช่เก็บเงียบ ๆ อยู่หลังบ้าน
 */

import Link from 'next/link'
import { useState } from 'react'
import { isoToDisplay } from '@/components/date-input'
import { ElementIcon } from '@/components/element-icon'
import { WorkspaceShell, employerNav } from '@/components/workspace/shell'
import type { ProfileKind, SavedProfile } from '@/lib/api'
import { profileKindLabel } from '@/lib/place'
import {
  useAddTeamMember,
  useCreateTeam,
  useDeleteProfile,
  useRemoveTeamMember,
  useSavedProfiles,
  useTeamMembers,
  useTeams,
} from '@/lib/queries'
import { useSession } from '@/lib/session'

export default function MemoryPage() {
  return (
    <WorkspaceShell nav={employerNav} brand="บัญชีองค์กร" requirePath="/employer/memory">
      <Memory />
    </WorkspaceShell>
  )
}

const KIND_FILTERS: { id: ProfileKind | 'all'; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'candidate', label: 'ผู้สมัคร' },
  { id: 'employee', label: 'พนักงาน' },
  { id: 'executive', label: 'ผู้บริหาร' },
]

function Memory() {
  const { user } = useSession()
  const [kind, setKind] = useState<ProfileKind | 'all'>('all')
  const { data: profiles = [], isPending, error } = useSavedProfiles()
  const deleteProfile = useDeleteProfile()

  const shown = kind === 'all' ? profiles : profiles.filter((p) => p.kind === kind)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Employer · คลังข้อมูล</span>
          <h1 className="mt-2 text-3xl">ข้อมูลที่ระบบจำไว้ให้</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {user?.organizationName ?? 'บัญชีองค์กร'} · ใช้ซ้ำได้ในทุกการวิเคราะห์ ไม่ต้องกรอกวันเกิดใหม่
          </p>
        </div>
        <Link href="/employer/dashboard" className="btn-ghost !py-2 text-sm">
          ← กลับหน้าภาพรวม
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ── ก. โปรไฟล์คน ─────────────────────────────── */}
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Profile Memory</h2>
            <div className="flex flex-wrap gap-1.5">
              {KIND_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setKind(filter.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    kind === filter.id
                      ? 'border-gold bg-gold/[0.08] text-ink'
                      : 'border-line text-muted hover:border-gold/40'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-xs text-muted">
            โปรไฟล์ถูกบันทึกอัตโนมัติทุกครั้งที่สั่งวิเคราะห์ — ลบได้ตลอดเวลาตามสิทธิ์ของเจ้าของข้อมูล (PDPA)
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
              {error.message}
            </p>
          )}

          {isPending ? (
            <div className="mt-4 space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-paper-warm" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyBox
              text="ยังไม่มีโปรไฟล์ในหมวดนี้ — วิเคราะห์ candidate สักคนแล้วระบบจะจำไว้ให้เอง"
              href="/employer/new"
              cta="เริ่มวิเคราะห์"
            />
          ) : (
            <div className="mt-4 space-y-2">
              {shown.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  onDelete={() => void deleteProfile.mutateAsync(profile.id).catch(() => undefined)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── ข. ทีม ───────────────────────────────────── */}
        <TeamRosterPanel profiles={profiles} />
      </div>
    </div>
  )
}

function ProfileRow({ profile, onDelete }: { profile: SavedProfile; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cloud p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{profile.name}</span>
          <span className="chip !py-0.5 text-[10px]">{profileKindLabel(profile.kind)}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          เกิด {isoToDisplay(profile.birthDate)}
          {profile.birthTime ? ` ${profile.birthTime}` : ''}
          {profile.placeLabel || profile.province ? ` · ${profile.placeLabel || profile.province}` : ''}
          {profile.lat != null && <span className="ml-1 text-jade"> · พิกัดยืนยันแล้ว</span>}
        </div>
      </div>
      {confirming ? (
        <div className="flex flex-none gap-2 text-xs">
          <button onClick={onDelete} className="text-terracotta hover:underline">
            ยืนยันลบ
          </button>
          <button onClick={() => setConfirming(false)} className="text-muted hover:underline">
            ไม่ลบ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex-none text-xs text-muted hover:text-terracotta hover:underline"
        >
          ลบ
        </button>
      )}
    </div>
  )
}

function TeamRosterPanel({ profiles }: { profiles: SavedProfile[] }) {
  const { data: teams = [], isPending } = useTeams()
  const createTeam = useCreateTeam()
  const [selected, setSelected] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeTeam = selected ?? teams[0]?.id ?? null

  async function submitTeam() {
    setError(null)
    if (!newTeam.trim()) return
    try {
      const created = await createTeam.mutateAsync({ name: newTeam.trim() })
      setNewTeam('')
      setSelected(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างทีมไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
        <h2 className="text-xl">Team Roster</h2>
        <p className="mt-2 text-xs text-muted">
          ประกอบทีมไว้ล่วงหน้า แล้วดึงทั้งชุดเข้าหน้าวิเคราะห์ได้ในคลิกเดียว — ไม่ต้องกรอกวันเกิดทีมใหม่ทุกครั้ง
        </p>

        {isPending ? (
          <div className="mt-4 h-10 animate-pulse rounded-lg bg-paper-warm" aria-hidden="true" />
        ) : (
          <div className="mt-4 space-y-1.5">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelected(team.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                  activeTeam === team.id ? 'border-gold bg-gold/[0.06]' : 'border-line hover:border-gold/40'
                }`}
              >
                <span className="text-ink">{team.name}</span>
                <span className="text-xs text-muted">{team.memberCount} คน</span>
              </button>
            ))}
            {teams.length === 0 && (
              <p className="text-xs text-muted">ยังไม่มีทีม — ตั้งทีมแรกได้ที่ช่องด้านล่าง</p>
            )}
          </div>
        )}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submitTeam()
          }}
        >
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            className="field flex-1"
            placeholder="ชื่อทีมใหม่ เช่น ทีมขายภาคเหนือ"
          />
          <button
            type="submit"
            disabled={!newTeam.trim() || createTeam.isPending}
            className="btn-ghost flex-none !px-4 !py-2 text-xs disabled:opacity-50"
          >
            + ตั้งทีม
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-terracotta">{error}</p>}
      </div>

      {activeTeam && <TeamMembersPanel teamId={activeTeam} profiles={profiles} />}
    </div>
  )
}

function TeamMembersPanel({ teamId, profiles }: { teamId: string; profiles: SavedProfile[] }) {
  const { data: members = [], isPending } = useTeamMembers(teamId)
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()
  const [pick, setPick] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inTeam = new Set(members.map((m) => m.profileId))
  const available = profiles.filter((p) => !inTeam.has(p.id))

  async function add() {
    setError(null)
    if (!pick) return
    try {
      await addMember.mutateAsync({ teamId, profileId: pick })
      setPick('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เพิ่มสมาชิกไม่สำเร็จ')
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">สมาชิกในทีม</h3>
        <ElementIcon element="wood" size={18} />
      </div>

      {isPending ? (
        <div className="mt-3 h-10 animate-pulse rounded-lg bg-paper-warm" aria-hidden="true" />
      ) : members.length === 0 ? (
        <p className="mt-3 text-xs text-muted">ยังไม่มีสมาชิก — เลือกจากโปรไฟล์ที่บันทึกไว้ด้านล่าง</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {members.map((member) => (
            <div
              key={member.profileId}
              className="flex items-center justify-between gap-2 rounded-lg bg-paper-warm/50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{member.profile.name}</div>
                <div className="text-[11px] text-muted">
                  {isoToDisplay(member.profile.birthDate)}
                  {member.position ? ` · ${member.position}` : ''}
                </div>
              </div>
              <button
                onClick={() =>
                  void removeMember
                    .mutateAsync({ teamId, profileId: member.profileId })
                    .catch(() => undefined)
                }
                className="flex-none text-[11px] text-muted hover:text-terracotta hover:underline"
              >
                นำออก
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="field flex-1">
          <option value="">— เลือกโปรไฟล์เพิ่มเข้าทีม —</option>
          {available.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profileKindLabel(profile.kind)})
            </option>
          ))}
        </select>
        <button
          onClick={() => void add()}
          disabled={!pick || addMember.isPending}
          className="btn-ghost flex-none !px-4 !py-2 text-xs disabled:opacity-50"
        >
          + เพิ่ม
        </button>
      </div>
      {available.length === 0 && profiles.length > 0 && (
        <p className="mt-2 text-[11px] text-muted">โปรไฟล์ที่บันทึกไว้อยู่ในทีมนี้ครบแล้ว</p>
      )}
      {error && <p className="mt-2 text-xs text-terracotta">{error}</p>}
    </div>
  )
}

function EmptyBox({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-line bg-paper-warm/40 p-8 text-center">
      <p className="text-sm text-ink-soft">{text}</p>
      <Link href={href} className="btn-ghost mt-4 !py-2 text-sm">
        {cta}
      </Link>
    </div>
  )
}
