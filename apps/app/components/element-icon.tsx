import type { ElementKey } from '@/lib/brand'
import { ELEMENT_META } from '@/lib/brand'

const PATHS: Record<ElementKey, React.ReactNode> = {
  // น้ำ — หยดน้ำ
  water: <path d="M12 2.5c3.8 4.8 6.6 8 6.6 11.4a6.6 6.6 0 1 1-13.2 0C5.4 10.5 8.2 7.3 12 2.5z" />,
  // ไฟ — เปลวไฟ
  fire: (
    <path d="M13 2c.6 2.7-1.2 4-1.6 5.9-.3 1.4.6 2.4 1.8 2.4 1.2 0 1.9-.9 1.9-2.2 1.7 1.5 2.9 3.6 2.9 6A6.9 6.9 0 0 1 5.4 14.3C5.4 10.7 9 9.2 10 6.4 10.5 5 10.9 3.6 13 2z" />
  ),
  // ทอง — ดาวสี่แฉก
  metal: <path d="M12 1.6c.7 5.3 2.8 7.4 8.1 8.1-5.3.7-7.4 2.8-8.1 8.1-.7-5.3-2.8-7.4-8.1-8.1 5.3-.7 7.4-2.8 8.1-8.1z" />,
  // ไม้ — ใบโคลเวอร์สี่แฉก
  wood: (
    <g>
      <circle cx="12" cy="7" r="4.1" />
      <circle cx="12" cy="16" r="4.1" />
      <circle cx="7.4" cy="11.6" r="4.1" />
      <circle cx="16.6" cy="11.6" r="4.1" />
    </g>
  ),
  // ดิน — สี่กลีบดินเผา (quatrefoil)
  earth: (
    <path d="M12 3.2c1.9 0 2.7 1.4 4.4 1.4S19.4 6 19.4 7.6s1.4 2.5 1.4 4.4-1.4 2.8-1.4 4.4-1.6 2.9-3 2.9-2.5 1.5-4.4 1.5-2.7-1.5-4.4-1.5-3-1.3-3-2.9 1.4-2.8 1.4-4.4-1.4-2.5-1.4-4.4S4.6 5.6 6 5.6 7.6 3.2 9.5 3.2z" />
  ),
}

export function ElementIcon({
  element,
  size = 24,
  className,
  color,
}: {
  element: ElementKey
  size?: number
  className?: string
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? ELEMENT_META[element].color}
      className={className}
      aria-hidden
    >
      {PATHS[element]}
    </svg>
  )
}

export { PATHS as ELEMENT_ICON_PATHS }
