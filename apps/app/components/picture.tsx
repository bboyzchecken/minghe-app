/**
 * รูปจาก /public — เสิร์ฟ .webp ก่อน แล้วตกกลับไป .jpg เองถ้าเบราว์เซอร์ไม่รองรับ
 *
 * เว็บนี้ build เป็น static export (`output: 'export'`) จึงไม่มี image optimizer ของ Next
 * ให้ใช้ — เราเตรียมสองฟอร์แมตไว้ล่วงหน้าด้วย `python tools/brand/optimize-images.py`
 * แล้วปล่อยให้เบราว์เซอร์เลือกเอง (.webp เล็กกว่า .jpg ราวครึ่งหนึ่ง)
 *
 * `priority` ใส่ได้รูปเดียวต่อหน้า — รูปที่เป็น LCP เท่านั้น ที่เหลือ lazy ทั้งหมด
 * ไม่งั้นรูปล่าง ๆ จะแย่งคิวดาวน์โหลดกับรูปบนสุดแล้วหน้าแรกช้าลง
 *
 * `width`/`height` เป็นขนาดจริงของไฟล์ ใส่ไว้บอกอัตราส่วนให้เบราว์เซอร์กันหน้าเด้ง (CLS)
 */
export function Picture({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: {
  /** path ของไฟล์ .jpg ใน /public เช่น `/img/hero-elements.jpg` — ตัว .webp หาเองจากชื่อเดียวกัน */
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
}) {
  const webp = src.replace(/\.jpe?g$/i, '.webp')
  return (
    // display:contents — ให้ <img> รับ layout จากกล่องแม่ตรง ๆ เหมือนตอนไม่มี <picture> ครอบ
    <picture className="contents">
      {/*
        เบราว์เซอร์หา <source> ใน <picture> เจอช้ากว่ารูปที่เขียน src ตรง ๆ
        จึงบอก preload ไว้ให้ชัด — React ยก <link> ก้อนนี้ขึ้นไปไว้ใน <head> ให้เอง
        ตัว type="image/webp" ทำให้เบราว์เซอร์ที่ไม่รองรับ webp ข้ามไปเฉย ๆ ไม่โหลดทิ้ง
      */}
      {priority ? (
        <link rel="preload" as="image" href={webp} type="image/webp" fetchPriority="high" />
      ) : null}
      <source srcSet={webp} type="image/webp" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? undefined : 'async'}
      />
    </picture>
  )
}
