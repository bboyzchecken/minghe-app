import Image from 'next/image'
import Link from 'next/link'

/**
 * โลโก้ของแบรนด์ (F-11)
 *
 * ไฟล์ต้นทางคือ `logo.png` ที่ลูกค้าส่งมา (แผ่น brand sheet) — สคริปต์แยกออกเป็นชิ้น ๆ
 * ไว้ที่ `public/brand/` โดยถอดพื้นครีมออกให้เป็นพื้นโปร่ง
 *
 * มีสามชิ้น เลือกตามพื้นที่ที่มี:
 *   lockup   — ชื่อ + หมิงเหอ + tagline "สมพงษ์คนกับองค์กร" (ใช้ตอนมีที่กว้าง)
 *   wordmark — ชื่อ + หมิงเหอ ไม่มี tagline (ค่าเริ่มต้นของ header)
 *   mark     — มาร์คตัวเดียว (ที่แคบมาก / favicon)
 *
 * `onDark` สลับไปใช้เวอร์ชันสว่างสำหรับพื้นเข้ม — ทองเข้มบนพื้นเข้มอ่านไม่ออก
 */

type Variant = 'lockup' | 'wordmark' | 'mark'

/** ขนาดจริงของไฟล์ ใช้บอกอัตราส่วนให้ next/image กันหน้าเด้งตอนโหลด */
const ASSETS: Record<Variant, { src: string; darkSrc: string; width: number; height: number }> = {
  lockup: {
    src: '/brand/logo-lockup.png',
    darkSrc: '/brand/logo-lockup-light.png',
    width: 1033,
    height: 194,
  },
  wordmark: {
    src: '/brand/logo-wordmark.png',
    darkSrc: '/brand/logo-wordmark-light.png',
    width: 449,
    height: 198,
  },
  mark: {
    src: '/brand/logo-mark.png',
    darkSrc: '/brand/logo-mark-light.png',
    width: 124,
    height: 155,
  },
}

export function Logo({
  variant,
  withTagline = false,
  onDark = false,
  height = 30,
  className = '',
  href = '/',
}: {
  variant?: Variant
  /** ทางลัดเดิม — มี tagline คือใช้ lockup */
  withTagline?: boolean
  onDark?: boolean
  /** ความสูงที่ต้องการเป็นพิกเซล ความกว้างคิดตามอัตราส่วนเอง */
  height?: number
  className?: string
  /** ใส่ null เมื่อโลโก้อยู่ในหน้าแรกอยู่แล้ว จะได้ไม่มีลิงก์วนไปหาตัวเอง */
  href?: string | null
}) {
  const asset = ASSETS[variant ?? (withTagline ? 'lockup' : 'wordmark')]
  const width = Math.round((asset.width / asset.height) * height)

  const image = (
    <Image
      src={onDark ? asset.darkSrc : asset.src}
      alt="命合 Mìnghé — สมพงษ์คนกับองค์กร"
      width={width}
      height={height}
      priority
      className="h-auto w-auto"
      style={{ height, width }}
    />
  )

  if (!href) return <span className={`inline-flex items-center ${className}`}>{image}</span>

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="命合 Mìnghé หน้าแรก">
      {image}
    </Link>
  )
}
