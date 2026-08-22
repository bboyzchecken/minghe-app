'use client'

/**
 * ตัวเลือก "ของที่ระบบจำไว้" ในหน้ากรอกฟอร์ม (F-25)
 *
 * เจตนา: คำสัญญาบนหน้าแรกคือ "ระบบจำข้อมูลที่กรอกไว้ให้" — ถ้าคลังมีข้อมูลแต่ฟอร์มไม่เอามาใช้
 * ผู้ใช้ก็ยังต้องพิมพ์วันเกิดใหม่ทุกครั้งอยู่ดี สองปุ่มนี้คือจุดที่คลังข้อมูลได้ทำงานจริง
 *
 * ยังไม่ได้ล็อกอิน หรือคลังยังว่าง → ไม่แสดงอะไรเลย ไม่รบกวนโฟลว์ของคนที่มาครั้งแรก
 */

import { useState } from 'react'
import type { BirthValue } from '@/components/forms'
import type { ProfileKind } from '@/lib/api'
import { profileKindLabel, profileToBirthValue } from '@/lib/place'
import { useSavedProfiles, useTeamMembers, useTeams } from '@/lib/queries'
import { isoToDisplay } from '@/components/date-input'

export function ProfilePicker({
  label,
  kind,
  onPick,
}: {
  label: string
  /** จำกัดชนิดโปรไฟล์ที่ให้เลือก เช่น เลือกเฉพาะผู้บริหาร */
  kind?: ProfileKind
  onPick: (value: BirthValue) => void
}) {
  const { data: profiles = [] } = useSavedProfiles(kind)
  const [open, setOpen] = useState(false)

  if (profiles.length === 0) return null

  return (
    <div className="mb-5 rounded-lg border border-line bg-paper-warm/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="ml-2 text-xs text-muted">มี {profiles.length} รายการที่บันทึกไว้</span>
        </span>
        <span className="text-xs text-gold">{open ? 'ซ่อน' : 'เลือก'}</span>
      </button>

      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                onPick(profileToBirthValue(profile))
                setOpen(false)
              }}
              className="rounded-lg border border-line bg-cloud p-3 text-left transition hover:border-gold/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink">{profile.name}</span>
                <span className="chip !py-0.5 text-[10px]">{profileKindLabel(profile.kind)}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {isoToDisplay(profile.birthDate)}
                {profile.birthTime ? ` · ${profile.birthTime}` : ''}
                {profile.placeLabel || profile.province ? ` · ${profile.placeLabel || profile.province}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** ดึงทีมที่บันทึกไว้ทั้งชุดเข้ามาใน Team Roster ของ wizard (F-25 ข้อ ข → ป้อนให้ F-20) */
export function SavedTeamPicker({ onPick }: { onPick: (members: BirthValue[]) => void }) {
  const { data: teams = [] } = useTeams()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const { data: members = [], isPending } = useTeamMembers(selected)

  if (teams.length === 0) return null

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost !px-4 !py-2 text-xs">
        ↺ ดึงทีมที่บันทึกไว้
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-line bg-card p-3 shadow-soft">
          <div className="text-xs font-medium text-ink">ทีมที่บันทึกไว้</div>
          <div className="mt-2 space-y-1.5">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelected(team.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition ${
                  selected === team.id ? 'border-gold bg-gold/[0.06]' : 'border-line hover:border-gold/50'
                }`}
              >
                <span className="text-ink">{team.name}</span>
                <span className="text-muted">{team.memberCount} คน</span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-3">
              <div className="text-[11px] text-muted">
                {isPending ? 'กำลังโหลดสมาชิก…' : `จะเพิ่ม ${members.length} คนเข้าในรายการ`}
              </div>
              <button
                type="button"
                disabled={isPending || members.length === 0}
                onClick={() => {
                  onPick(members.map((m) => profileToBirthValue(m.profile)))
                  setOpen(false)
                  setSelected(null)
                }}
                className="btn-primary mt-2 w-full !py-2 text-xs disabled:opacity-50"
              >
                เพิ่มทั้งทีม
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
