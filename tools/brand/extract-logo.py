"""แยกชิ้นส่วนโลโก้จาก logo.png (แผ่น brand sheet) ออกเป็นไฟล์ใช้งานจริง

วิธีทำพื้นโปร่ง: พื้นของแผ่นเป็นสีครีมเรียบสีเดียว จึงถอดพื้นออกด้วยการ "unpremultiply"
เทียบกับสีพื้นที่รู้ค่าแน่นอน — ผลลัพธ์เมื่อวางบนพื้นครีมของเว็บจะเหมือนต้นฉบับเป๊ะ
และยังได้ขอบตัวอักษรที่ไล่ระดับ (anti-alias) ครบ ไม่เป็นขอบหยัก
"""
import os
import numpy as np
from PIL import Image

SRC = 'logo.png'
OUT = 'apps/app/public/brand'
BG = np.array([238, 233, 223], dtype=float)  # สีพื้นของแผ่น brand sheet

os.makedirs(OUT, exist_ok=True)
sheet = Image.open(SRC).convert('RGB')


def cut(box, name, pad=6):
    """ตัดกรอบ → ถอดพื้นครีม → ตัดขอบว่างออก → บันทึกเป็น PNG พื้นโปร่ง"""
    sub = np.asarray(sheet.crop(box)).astype(float)

    # alpha ต่อพิกเซล: ช่องสีที่เบี่ยงจากพื้นมากที่สุดเป็นตัวกำหนดความทึบ
    ratio = np.clip(sub / BG, 0, 1)
    alpha = 1.0 - ratio.min(axis=2)

    # ถอดพื้นออกจากสี (unpremultiply) เพื่อให้สีที่ได้เป็นสีของ "หมึก" จริง ๆ
    a = np.clip(alpha, 1e-6, 1)[..., None]
    color = np.clip((sub - (1 - a) * BG) / a, 0, 255)

    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')

    # ตัดขอบว่าง แล้วเว้นระยะหายใจเท่ากันทุกด้าน
    bbox = img.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        img = img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))

    img.save(f'{OUT}/{name}.png')
    print(f'{name}.png', img.size)
    return img


def light_variant(img, name):
    """เวอร์ชันสำหรับพื้นเข้ม — ดันความสว่างขึ้นโดยคงเฉดเดิม (ทองยังเป็นทอง เทายังเป็นเทา)"""
    arr = np.asarray(img).astype(float)
    rgb, alpha = arr[..., :3], arr[..., 3:]
    # ผสมเข้าหาสีครีมสว่าง 62% — ยังเห็นความต่างระหว่างทองกับเทาอยู่
    lifted = np.clip(rgb * 0.38 + np.array([245, 232, 205]) * 0.62, 0, 255)
    out = Image.fromarray(np.dstack([lifted, alpha]).astype(np.uint8), 'RGBA')
    out.save(f'{OUT}/{name}.png')
    print(f'{name}.png', out.size)


lockup = cut((120, 100, 1180, 310), 'logo-lockup')          # โลโก้เต็มพร้อม tagline
mark = cut((130, 415, 275, 600), 'logo-mark')               # มาร์คตัวเดียว (ใช้ทำ favicon)
wordmark = cut((120, 730, 610, 955), 'logo-wordmark')       # โลโก้ไม่มี tagline

light_variant(lockup, 'logo-lockup-light')
light_variant(mark, 'logo-mark-light')
light_variant(wordmark, 'logo-wordmark-light')

# แถบห้าธาตุจากแผ่นแบรนด์ — เก็บเป็นภาพอ้างอิงไว้เทียบตอนเจนภาพ hero (F-16)
sheet.crop((1290, 700, 1920, 920)).save(f'{OUT}/elements-strip-reference.png')
print('elements-strip-reference.png saved')
