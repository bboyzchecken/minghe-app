'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from './logo'

const NAV = [
  { href: '/employer', label: 'สำหรับองค์กร' },
  { href: '/jobseeker', label: 'สำหรับคนทำงาน' },
  { href: '/pricing', label: 'ราคา' },
  { href: '/report', label: 'ตัวอย่างรายงาน' },
  { href: '/r', label: 'เปิดรายงาน' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-ink-soft transition-colors hover:text-gold"
            >
              {n.label}
            </Link>
          ))}
          {/* F-04 — "เข้าสู่ระบบ" ต้องอยู่ก่อนปุ่ม "เริ่มวิเคราะห์" ที่มุมขวาบน */}
          <Link href="/login" className="text-sm font-medium text-ink transition-colors hover:text-gold">
            เข้าสู่ระบบ
          </Link>
          <Link href="/employer/new" className="btn-primary text-sm">
            เริ่มวิเคราะห์
          </Link>
        </nav>
        <button
          className="md:hidden rounded-md border border-line p-2 text-ink-soft"
          onClick={() => setOpen((v) => !v)}
          aria-label="เมนู"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-paper md:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-ink-soft"
              >
                {n.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 text-sm font-medium text-ink">
              เข้าสู่ระบบ
            </Link>
            <Link href="/employer/new" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm">
              เริ่มวิเคราะห์
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
