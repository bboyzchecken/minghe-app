"""สร้างฟอนต์จีน Noto Serif SC ฉบับ subset สำหรับเว็บ (apps/app/app/fonts/)

**ทำไมต้อง subset**

ถ้าเรียก `Noto_Serif_SC` จาก `next/font/google` ตรง ๆ Google จะส่ง @font-face
กลับมา 300+ ก้อน (ซอยตามช่วง unicode ของตัวจีนทั้งชุด) — next/font ฝังทั้งหมดลง
CSS ก้อนหลักที่บล็อกการเรนเดอร์ กลายเป็นไฟล์ ~279 KB ในทุกหน้า
ทั้งที่เว็บนี้มีตัวจีนโผล่จริงแค่ ~230 ตัว (命合, ชื่อธาตุ, ก้านฟ้า-กิ่งดิน ฯลฯ)

สคริปต์นี้กวาดตัวจีนที่โผล่ใน source ทั้ง repo แล้วขอ subset จาก Google Fonts
ผ่านพารามิเตอร์ `text=` ได้ไฟล์ woff2 ก้อนเดียว ~44 KB ที่โหลดต่อเมื่อหน้ามีตัวจีน

**ต้องรันใหม่เมื่อไร**

เมื่อเพิ่มตัวจีนตัวใหม่ลงในโค้ด — ถ้าลืมรัน ตัวที่ขาดจะไม่เป็นสี่เหลี่ยมเปล่า
แต่จะตกไปใช้ฟอนต์จีนของระบบแทน (ดู `fallback` ใน app/layout.tsx) ซึ่งหน้าตาจะเพี้ยนจากแบรนด์

รันจาก root ของโปรเจกต์:

    python tools/brand/subset-cjk-font.py

ลิขสิทธิ์ฟอนต์: Noto Serif SC — SIL Open Font License 1.1 (โฮสต์เองได้)
"""
import os
import re
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = '.'
OUT = 'apps/app/app/fonts/noto-serif-sc-subset-400.woff2'
WEIGHT = 400

SKIP_DIRS = {'node_modules', '.next', 'out', '.turbo', '.git', 'dist', 'build'}
SCAN_EXTS = ('.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css', '.md', '.go', '.html', '.yml', '.yaml', '.txt')

# ช่วงตัวอักษรจีน + เครื่องหมายวรรคตอนแบบเต็มความกว้าง
HAN = re.compile(r'[㐀-䶿一-鿿豈-﫿　-〿！-｠]')

# เผื่อไว้สำหรับตัวที่มาจาก API ไม่ได้อยู่ใน source: ก้านฟ้าสิบ กิ่งดินสิบสอง ห้าธาตุ
# และคำศัพท์ปาจือที่ใช้บ่อย — ราคาถูกมาก (ไม่กี่ KB) แต่กัน fallback หลุดโทนแบรนด์
EXTRA = (
    '甲乙丙丁戊己庚辛壬癸'
    '子丑寅卯辰巳午未申酉戌亥'
    '木火土金水陰陽阴阳'
    '年月日時时柱大運运流命合和沖冲刑害婚八字五行天干地支'
    '正偏財财官殺杀印比劫食傷伤男女生辰農农历曆'
    '0123456789'
)

UA = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    )
}


def collect_chars() -> str:
    chars = set(EXTRA)
    for dirpath, dirnames, filenames in os.walk(REPO_ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if not name.endswith(SCAN_EXTS):
                continue
            try:
                text = open(os.path.join(dirpath, name), encoding='utf8').read()
            except (UnicodeDecodeError, OSError):
                continue
            chars.update(HAN.findall(text))
    return ''.join(sorted(chars))


def fetch_subset(chars: str) -> bytes:
    url = (
        'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@%d&display=swap&text=%s'
        % (WEIGHT, urllib.parse.quote(chars, safe=''))
    )
    css = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode('utf8')
    match = re.search(r"url\((https://[^)]+)\)\s*format\('woff2'\)", css)
    if not match:
        raise SystemExit('Google Fonts ไม่ได้ส่ง woff2 กลับมา — ดู CSS ที่ได้:\n' + css[:500])
    return urllib.request.urlopen(urllib.request.Request(match.group(1), headers=UA), timeout=30).read()


def main() -> None:
    if not os.path.isdir('apps/app'):
        raise SystemExit('รันจาก root ของโปรเจกต์ (โฟลเดอร์ที่มี apps/)')

    chars = collect_chars()
    data = fetch_subset(chars)
    if data[:4] != b'wOF2':
        raise SystemExit('ไฟล์ที่ได้ไม่ใช่ woff2')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'wb').write(data)
    print(f'ตัวอักษร {len(chars)} ตัว → {OUT} ({len(data) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
