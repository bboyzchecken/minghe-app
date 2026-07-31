'use client'

import { useState } from 'react'
import { ELEMENT_META, ELEMENT_ORDER, type ElementKey } from '@/lib/brand'
import { ElementIcon } from './element-icon'

type View = 'man' | 'woman' | 'texture'

const VIEWS: { id: View; label: string }[] = [
  { id: 'man', label: 'ชาย' },
  { id: 'woman', label: 'หญิง' },
  { id: 'texture', label: 'ธาตุ' },
]

function imgOf(el: ElementKey, view: View) {
  if (view === 'texture') return `/img/el-${el}.jpg`
  return `/img/el-${el}-${view === 'man' ? 'm' : 'f'}.jpg`
}

export function ElementGallery() {
  const [el, setEl] = useState<ElementKey>('wood')
  const [view, setView] = useState<View>('man')
  const m = ELEMENT_META[el]

  return (
    <div className="rounded-[28px] border border-line bg-card p-4 shadow-card sm:p-6 md:p-8">
      {/* element tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {ELEMENT_ORDER.map((e) => {
          const meta = ELEMENT_META[e]
          const active = e === el
          return (
            <button
              key={e}
              onClick={() => setEl(e)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                active ? 'text-cloud shadow-soft' : 'border-line bg-cloud text-ink-soft hover:border-gold/40'
              }`}
              style={active ? { background: meta.color, borderColor: meta.color } : undefined}
            >
              <ElementIcon element={e} size={16} color={active ? '#ffffff' : meta.color} />
              <span className="font-medium">{meta.th}</span>
              <span className="cjk text-xs opacity-70">{meta.cn}</span>
            </button>
          )
        })}
      </div>

      {/* feature */}
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,0.9fr)_1fr] md:items-center">
        <div className="relative overflow-hidden rounded-2xl border border-line">
          <img
            key={imgOf(el, view)}
            src={imgOf(el, view)}
            alt={`${m.th} · ${view}`}
            className="fade-up aspect-[4/5] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 to-transparent" />
          {/* view switch */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-cloud/85 p-1 backdrop-blur-md">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  view === v.id ? 'text-cloud' : 'text-ink-soft hover:text-ink'
                }`}
                style={view === v.id ? { background: m.color } : undefined}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${m.color}1a` }}>
              <ElementIcon element={el} size={26} />
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="cjk text-2xl" style={{ color: m.color }}>
                  {m.cn}
                </span>
                <span className="font-display-en text-2xl font-semibold" style={{ color: m.color }}>
                  {m.en}
                </span>
              </div>
              <div className="text-sm text-muted">ธาตุ{m.th}</div>
            </div>
          </div>

          <h3 className="mt-5 text-3xl text-ink">คน{m.th}หยาง</h3>
          <p className="mt-2 text-ink-soft">{m.vibe}</p>

          <div className="mt-5 rounded-xl bg-paper-warm/60 p-4 text-sm text-ink-soft">
            {DESCRIPTIONS[el]}
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-muted">
            <span>ธาตุที่เกื้อกูล:</span>
            {SUPPORT[el].map((s) => (
              <span key={s} className="chip !py-0.5" style={{ borderColor: `${ELEMENT_META[s].color}66` }}>
                <ElementIcon element={s} size={12} /> {ELEMENT_META[s].th}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const DESCRIPTIONS: Record<ElementKey, string> = {
  wood: 'คนธาตุไม้มีพลังของการเติบโตและริเริ่ม มองไปข้างหน้าเสมอ ชอบเรียนรู้และขยายขอบเขต เหมาะกับบทบาทที่ได้บุกเบิก วางแผนระยะยาว และพัฒนาคน',
  fire: 'คนธาตุไฟมีพลังของความกระตือรือร้นและการแสดงออก จุดประกายผู้คนรอบข้างได้ เหมาะกับงานที่ต้องสื่อสาร สร้างแรงบันดาลใจ และเป็นหน้าเป็นตา',
  earth: 'คนธาตุดินมีพลังของความมั่นคงและน่าไว้วางใจ เป็นหลักให้ผู้อื่นพักพิง เหมาะกับบทบาทที่ต้องดูแล ประสาน และรักษาความต่อเนื่องขององค์กร',
  metal: 'คนธาตุทองมีพลังของความเฉียบคมและหลักการ ตัดสินใจชัดเจน รักษามาตรฐาน เหมาะกับงานที่ต้องแม่นยำ กำกับดูแล และวางระบบระเบียบ',
  water: 'คนธาตุน้ำมีพลังของปัญญาและความยืดหยุ่น ปรับตัวเก่ง มองเห็นทางเลือกที่คนอื่นมองข้าม เหมาะกับงานวิเคราะห์ เจรจา และเชื่อมโยงผู้คน',
}

const SUPPORT: Record<ElementKey, ElementKey[]> = {
  wood: ['water'],
  fire: ['wood'],
  earth: ['fire'],
  metal: ['earth'],
  water: ['metal'],
}
