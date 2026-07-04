'use client'

/**
 * ปุ่มพิมพ์/บันทึก PDF + ปุ่มคัดลอกรหัส — บนแถบเครื่องมือ (no-print)
 */

import { useState } from 'react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-cinnabar px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-cinnabar-deep"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
      พิมพ์ / บันทึก PDF
    </button>
  )
}

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard ใช้ไม่ได้ (non-secure context) — เงียบไว้
    }
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold"
    >
      <span className="font-mono">{code}</span>
      <span className="text-xs text-muted">{copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}</span>
    </button>
  )
}
