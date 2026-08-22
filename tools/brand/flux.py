"""ตัวช่วยเรียก FLUX (Black Forest Labs) สำหรับเจนภาพประกอบเว็บ

อ่าน BFL_API_KEY จาก .env ของ root แล้วยิงงาน → รอผล → เซฟไฟล์
"""
import io
import os
import sys
import time

import requests
from PIL import Image

def api_key() -> str:
    for line in open('.env', encoding='utf-8'):
        line = line.strip()
        if line.startswith('BFL_API_KEY='):
            return line.split('=', 1)[1].strip()
    raise SystemExit('ไม่พบ BFL_API_KEY ใน .env')


KEY = api_key()
BASE = 'https://api.bfl.ai/v1'
MODEL = 'flux-pro-1.1'


def generate(prompt: str, width: int, height: int, seed: int | None = None, timeout: int = 180):
    """ส่งงานเจนภาพแล้วรอจนได้ผล — คืน bytes ของภาพ"""
    res = requests.post(
        f'{BASE}/{MODEL}',
        headers={'x-key': KEY, 'Content-Type': 'application/json'},
        json={
            'prompt': prompt,
            'width': width,
            'height': height,
            'prompt_upsampling': False,
            'safety_tolerance': 2,
            **({'seed': seed} if seed is not None else {}),
        },
        timeout=60,
    )
    if res.status_code != 200:
        raise SystemExit(f'ส่งงานไม่สำเร็จ {res.status_code}: {res.text[:400]}')

    payload = res.json()
    polling_url = payload.get('polling_url') or f'{BASE}/get_result?id={payload["id"]}'

    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(2)
        poll = requests.get(polling_url, headers={'x-key': KEY}, timeout=30).json()
        status = poll.get('status')
        if status == 'Ready':
            url = poll['result']['sample']
            return requests.get(url, timeout=120).content
        if status in ('Error', 'Failed', 'Content Moderated', 'Request Moderated'):
            raise SystemExit(f'เจนไม่สำเร็จ: {poll}')
    raise SystemExit('หมดเวลารอผลจาก FLUX')


def save_jpeg(data: bytes, path: str, quality: int = 88):
    img = Image.open(io.BytesIO(data)).convert('RGB')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    print(f'{path}  {img.size}  {os.path.getsize(path) // 1024} KB')
    return img


if __name__ == '__main__':
    # โหมดทดสอบ: python flux.py "prompt" width height out.jpg
    data = generate(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
    save_jpeg(data, sys.argv[4])
