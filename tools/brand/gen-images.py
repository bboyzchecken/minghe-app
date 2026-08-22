"""เจนภาพประกอบเว็บด้วย FLUX — F-16 (ภาพครบห้าธาตุ) และ F-17 (นายจ้าง / คนหางาน)

โทนที่คุมทุกภาพ: ครีมอุ่น ทองโบราณ ดินเผา เขียวมะกอก ฟ้าหม่น — ให้เข้ากับ palette ใน
tailwind.config.ts และแผ่นแบรนด์ที่ลูกค้าส่งมา · เลี่ยงลุคหมอดู ให้ออกไปทาง editorial/พรีเมียม
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flux import generate, save_jpeg  # noqa: E402

OUT = 'apps/app/public/img'

PALETTE = (
    'warm cream and antique gold color grading with muted olive, terracotta and dusty blue accents, '
    'soft diffused natural light, minimalist modern Chinese aesthetic, calm and premium, '
    'photorealistic editorial photography, no text, no letters, no watermark, no logos'
)

JOBS = [
    # ── F-16 · ภาพครบห้าธาตุ ────────────────────────────────
    (
        'hero-elements',
        960, 1280,
        'Vertical editorial still life photographed from directly above on a warm cream paper background. '
        'Five Chinese five-element materials arranged as one elegant vertical column: '
        'fresh green bamboo leaves at the top (wood), a small warm glowing ember (fire), '
        'fine rippled sand (earth), a polished brass ring (metal), '
        'and a shallow dish of clear still water with gentle ripples at the bottom (water). '
        'Delicate soft shadows, generous negative space, museum catalogue quality. ' + PALETTE,
        11,
    ),
    (
        'brand-band-elements',
        1440, 608,
        'Ultra wide editorial still life banner. Five seamless vertical panels of natural material side by side, '
        'left to right: weathered pale wood grain, deep terracotta ember texture with faint glow, '
        'fine rippled sand dunes, dark polished stone with thin gold veins, and clear rippling water. '
        'Even soft daylight, subtle paper texture overlay, balanced composition. ' + PALETTE,
        12,
    ),
    # ── F-17 · นายจ้าง (บริบทเรื่องงานต้องอ่านออก) ──────────
    (
        'employer-a',
        1024, 1280,
        'Editorial corporate portrait. Confident Thai woman in her early forties, a company owner, '
        'wearing a tailored cream blazer, standing in a bright modern Bangkok office with warm wood furniture '
        'and green plants, holding a tablet showing a candidate profile, an interview table with two chairs '
        'visible behind her, natural window light, shallow depth of field, calm assured expression, '
        'waist-up portrait, looking at camera. ' + PALETTE,
        21,
    ),
    (
        'employer-b',
        1024, 1280,
        'Editorial corporate portrait. Thai man in his early fifties, a company founder, wearing a soft grey '
        'shirt with sleeves rolled up, standing at the head of a bright meeting room table with printed '
        'resumes and a laptop in front of him, a colleague slightly out of focus in the background, '
        'large window with warm daylight, shallow depth of field, thoughtful welcoming expression, '
        'waist-up portrait. ' + PALETTE,
        22,
    ),
    # ── F-17 · คนหางาน ──────────────────────────────────────
    (
        'jobseeker-a',
        1024, 1280,
        'Editorial portrait. Thai man in his early thirties, business casual light linen shirt, sitting at a '
        'wooden desk in a bright co-working space with an open laptop, a notebook and a cup of coffee, '
        'pausing to look thoughtfully toward the window as if weighing a career decision, '
        'warm afternoon light, shallow depth of field, quiet contemplative mood, waist-up portrait. ' + PALETTE,
        31,
    ),
    (
        'jobseeker-b',
        1024, 1280,
        'Editorial portrait. Thai woman in her late twenties, smart casual knit top, sitting at a bright desk '
        'with a laptop, a printed resume and a small plant, hand resting near her chin as she considers a '
        'job offer, soft window light from the side, shallow depth of field, hopeful focused expression, '
        'waist-up portrait. ' + PALETTE,
        32,
    ),
]

if __name__ == '__main__':
    wanted = set(sys.argv[1:])
    for name, w, h, prompt, seed in JOBS:
        if wanted and name not in wanted:
            continue
        print(f'>> {name} ({w}x{h}) ...')
        save_jpeg(generate(prompt, w, h, seed=seed), f'{OUT}/{name}.jpg')
