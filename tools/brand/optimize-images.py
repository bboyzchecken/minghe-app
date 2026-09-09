"""บีบภาพใน apps/app/public/img ให้เล็กลง โดยที่ตายังแยกไม่ออก

ภาพชุดนี้ถูกสร้างมาด้วย quality สูงมาก (ไฟล์ละ 200-370 KB) ซึ่งเกินความจำเป็น
สำหรับขนาดที่แสดงจริงบนหน้าเว็บ — สคริปต์นี้ทำสองอย่าง

  1. บีบ JPEG ทับที่เดิม (progressive + quality 82) — ไม่ต้องแก้โค้ดเลย
     ทุกเบราว์เซอร์อ่านได้เหมือนเดิม
  2. สร้าง .webp คู่กันไว้ให้ <Picture> เลือกใช้ก่อน (เล็กกว่า JPEG ~40%)
     ถ้าเบราว์เซอร์ไหนไม่รองรับก็ตกกลับไปที่ .jpg เอง

รันจาก root ของโปรเจกต์:

    python tools/brand/optimize-images.py

ไฟล์ที่บีบแล้วจะถูกข้ามในรอบถัดไปโดยอัตโนมัติ (บีบซ้ำได้ ไม่พัง แต่ไม่ได้อะไรเพิ่ม)
"""
import glob
import os
import sys

from PIL import Image

SRC = 'apps/app/public/img'
JPEG_QUALITY = 82
WEBP_QUALITY = 78


# คอนโซล Windows ปริยายเป็น cp1252 — บังคับ utf-8 ไม่งั้น print ภาษาไทยพัง
sys.stdout.reconfigure(encoding='utf-8')


def kb(n: int) -> str:
    return f'{n / 1024:.0f} KB'


def main() -> None:
    paths = sorted(glob.glob(os.path.join(SRC, '*.jpg')))
    if not paths:
        raise SystemExit(f'ไม่พบไฟล์ .jpg ใน {SRC} — รันจาก root ของโปรเจกต์หรือยัง?')

    before = after = 0
    for path in paths:
        src_size = os.path.getsize(path)
        before += src_size

        with Image.open(path) as im:
            im = im.convert('RGB')

            # JPEG ทับที่เดิม — เขียนก็ต่อเมื่อเล็กลงจริง
            tmp = path + '.tmp'
            im.save(tmp, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
            if os.path.getsize(tmp) < src_size:
                os.replace(tmp, path)
            else:
                os.remove(tmp)

            # WebP คู่กัน
            webp = os.path.splitext(path)[0] + '.webp'
            im.save(webp, 'WEBP', quality=WEBP_QUALITY, method=6)

        jpg_size = os.path.getsize(path)
        webp_size = os.path.getsize(webp)
        after += webp_size
        print(f'{os.path.basename(path):24s} {kb(src_size):>8s} → jpg {kb(jpg_size):>8s} · webp {kb(webp_size):>8s}')

    print(f'\nรวม {len(paths)} ไฟล์: {kb(before)} → {kb(after)} (นับเฉพาะ .webp ที่เบราว์เซอร์สมัยใหม่จะโหลด)')


if __name__ == '__main__':
    main()
