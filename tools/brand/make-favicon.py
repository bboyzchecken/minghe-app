"""สร้าง favicon จากมาร์คของแบรนด์ (F-11)

Next.js App Router อ่านไฟล์ชื่อ icon.png / apple-icon.png ใน app/ แล้วใส่ <link> ให้เอง
ทำงานกับ output: 'export' ด้วย เพราะถูก emit เป็นไฟล์ static ตอน build
"""
import numpy as np
from PIL import Image

mark = Image.open('apps/app/public/brand/logo-mark.png').convert('RGBA')

PAPER = (246, 243, 235, 255)   # สีการ์ดของเว็บ — favicon ใช้พื้นทึบจะได้ไม่จมกับแท็บสีเข้ม
GOLD = (176, 125, 43)


def square(size: int, pad_ratio: float, bg) -> Image.Image:
    """วางมาร์คกลางสี่เหลี่ยมจัตุรัส เว้นขอบตามสัดส่วนที่กำหนด"""
    canvas = Image.new('RGBA', (size, size), bg)
    inner = int(size * (1 - pad_ratio * 2))
    scale = min(inner / mark.width, inner / mark.height)
    w, h = max(1, round(mark.width * scale)), max(1, round(mark.height * scale))
    resized = mark.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(resized, ((size - w) // 2, (size - h) // 2))
    return canvas


# ไอคอนแท็บเบราว์เซอร์ + ไอคอนบนหน้าจอโฮมของ iOS
square(256, 0.16, PAPER).save('apps/app/app/icon.png')
square(180, 0.14, PAPER).save('apps/app/app/apple-icon.png')

# .ico หลายขนาดไว้เผื่อเบราว์เซอร์เก่าและ pin แท็บ
base = square(256, 0.16, PAPER)
base.save('apps/app/app/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# เวอร์ชันพื้นเข้ม เผื่อใช้ทำ og-image หรือสไลด์
dark = Image.new('RGBA', (256, 256), (46, 42, 35, 255))
light_mark = Image.open('apps/app/public/brand/logo-mark-light.png').convert('RGBA')
scale = min(180 / light_mark.width, 180 / light_mark.height)
w, h = round(light_mark.width * scale), round(light_mark.height * scale)
dark.alpha_composite(light_mark.resize((w, h), Image.LANCZOS), ((256 - w) // 2, (256 - h) // 2))
dark.save('apps/app/public/brand/logo-mark-on-dark.png')

for p in ('apps/app/app/icon.png', 'apps/app/app/apple-icon.png', 'apps/app/app/favicon.ico',
          'apps/app/public/brand/logo-mark-on-dark.png'):
    print(p, Image.open(p).size)
