/**
 * ไอคอนเส้นบาง (Lucide-style) สำหรับ workspace — วาดเองเพื่อไม่เพิ่ม dependency
 * ใช้ currentColor เสมอ จะได้เปลี่ยนสีตามข้อความรอบ ๆ
 */

export type IconName =
  | 'home'
  | 'inbox'
  | 'users'
  | 'receipt'
  | 'chart'
  | 'file'
  | 'user'
  | 'database'
  | 'plus'
  | 'search'
  | 'refresh'
  | 'logout'
  | 'external'
  | 'check'
  | 'x'
  | 'gift'
  | 'printer'
  | 'arrow-right'
  | 'alert'
  | 'clock'
  | 'menu'
  | 'shield'
  | 'wallet'

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M4 4h16v16H4z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20c0-2.9-1.8-5-4.5-5.7" />
    </>
  ),
  receipt: <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h4" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  file: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4 3.4-7 7.5-7s7.5 3 7.5 7" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  logout: <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M6 18 18 6" />,
  gift: <path d="M3 10h18v4H3zM5 14v7h14v-7M12 10v11M12 10c-2-4-6-4-6-1.5S10 10 12 10zm0 0c2-4 6-4 6-1.5S14 10 12 10z" />,
  printer: <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17v.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4" />,
  wallet: <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7V5a2 2 0 0 1 2-2h11v4M16 13h5v4h-5a2 2 0 0 1 0-4z" />,
}

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
