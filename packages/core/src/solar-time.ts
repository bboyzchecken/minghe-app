/**
 * เวลาสุริยะจริง (真太陽時 / True Solar Time)
 *
 * ทำไมสำคัญ: ประเทศไทยใช้เขตเวลา UTC+7 (เส้นเมริเดียน 105°E) แต่พื้นที่จริง
 * อยู่ราวลองจิจูด 98–105°E — กรุงเทพฯ (100.5°E) เวลานาฬิกา "เร็วกว่า" ดวงอาทิตย์จริง
 * ประมาณ 18 นาที บวกสมการเวลา (Equation of Time) อีก ±16 นาทีตามฤดู
 * รวมแล้วคลาดได้เกิน ±30 นาที — เพียงพอที่จะทำให้ "เสาเวลา" ผิดชั่วโมงได้
 *
 * สูตร: เวลาสุริยะจริง = เวลานาฬิกา + 4 นาที × (ลองจิจูด − เมริเดียนเขตเวลา) + EoT
 */

export interface SolarTimeCorrection {
  /** นาทีจากส่วนต่างลองจิจูด */
  longitudeCorrectionMinutes: number
  /** นาทีจากสมการเวลา */
  equationOfTimeMinutes: number
  /** รวม (นาที) */
  totalMinutes: number
}

/**
 * สมการเวลา (Equation of Time) หน่วยนาที
 * ใช้สูตรอนุกรมฟูเรียร์ของ Spencer (1971) — ความคลาดเคลื่อน < ~0.6 นาที
 * เพียงพอสำหรับการตัดสินขอบชั่วโมงจีน (ช่วงละ 120 นาที)
 */
export function equationOfTimeMinutes(year: number, month: number, day: number, hour = 12): number {
  const dayOfYear = dayOfYearOf(year, month, day)
  const daysInYear = isLeapYear(year) ? 366 : 365
  const gamma = ((2 * Math.PI) / daysInYear) * (dayOfYear - 1 + (hour - 12) / 24)
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  )
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const CUMULATIVE_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

export function dayOfYearOf(year: number, month: number, day: number): number {
  const base = CUMULATIVE_DAYS[month - 1] ?? 0
  return base + day + (month > 2 && isLeapYear(year) ? 1 : 0)
}

/**
 * คำนวณการชดเชยเวลาสุริยะจริง
 * @param longitude ลองจิจูดสถานที่เกิด (องศาตะวันออก)
 * @param tzOffsetHours เขตเวลา (ไทย = 7 → เมริเดียน 105°E)
 */
export function solarTimeCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  longitude: number,
  tzOffsetHours = 7,
): SolarTimeCorrection {
  const standardMeridian = tzOffsetHours * 15
  const longitudeCorrectionMinutes = 4 * (longitude - standardMeridian)
  const eot = equationOfTimeMinutes(year, month, day, hour)
  return {
    longitudeCorrectionMinutes: round2(longitudeCorrectionMinutes),
    equationOfTimeMinutes: round2(eot),
    totalMinutes: round2(longitudeCorrectionMinutes + eot),
  }
}

/** เลื่อนวัน-เวลา (ปฏิทินเกรกอเรียน) ด้วยจำนวนนาที — ไม่พึ่ง Date เพื่อเลี่ยงปัญหา timezone ของเครื่อง */
export function shiftDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  deltaMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  let totalMinutes = hour * 60 + minute + Math.round(deltaMinutes)
  let y = year
  let m = month
  let d = day
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60
    d -= 1
    if (d < 1) {
      m -= 1
      if (m < 1) {
        m = 12
        y -= 1
      }
      d = daysInMonth(y, m)
    }
  }
  while (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60
    d += 1
    if (d > daysInMonth(y, m)) {
      d = 1
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  }
  return { year: y, month: m, day: d, hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 }
}

export function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 30
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** ---- พิกัดจังหวัดไทย (ลองจิจูด/ละติจูดตัวเมือง โดยประมาณ ±0.1° ≈ ±24 วินาทีเวลา) ---- */

export interface ProvinceCoord {
  name: string
  longitude: number
  latitude: number
}

export const THAI_PROVINCES: ProvinceCoord[] = [
  { name: 'กรุงเทพมหานคร', longitude: 100.52, latitude: 13.75 },
  { name: 'กระบี่', longitude: 98.91, latitude: 8.06 },
  { name: 'กาญจนบุรี', longitude: 99.53, latitude: 14.02 },
  { name: 'กาฬสินธุ์', longitude: 103.51, latitude: 16.43 },
  { name: 'กำแพงเพชร', longitude: 99.52, latitude: 16.48 },
  { name: 'ขอนแก่น', longitude: 102.84, latitude: 16.44 },
  { name: 'จันทบุรี', longitude: 102.1, latitude: 12.61 },
  { name: 'ฉะเชิงเทรา', longitude: 101.07, latitude: 13.69 },
  { name: 'ชลบุรี', longitude: 100.98, latitude: 13.36 },
  { name: 'ชัยนาท', longitude: 100.13, latitude: 15.19 },
  { name: 'ชัยภูมิ', longitude: 102.03, latitude: 15.81 },
  { name: 'ชุมพร', longitude: 99.18, latitude: 10.49 },
  { name: 'เชียงราย', longitude: 99.83, latitude: 19.91 },
  { name: 'เชียงใหม่', longitude: 98.99, latitude: 18.79 },
  { name: 'ตรัง', longitude: 99.61, latitude: 7.56 },
  { name: 'ตราด', longitude: 102.51, latitude: 12.24 },
  { name: 'ตาก', longitude: 99.13, latitude: 16.88 },
  { name: 'นครนายก', longitude: 101.21, latitude: 14.2 },
  { name: 'นครปฐม', longitude: 100.06, latitude: 13.82 },
  { name: 'นครพนม', longitude: 104.78, latitude: 17.39 },
  { name: 'นครราชสีมา', longitude: 102.1, latitude: 14.97 },
  { name: 'นครศรีธรรมราช', longitude: 99.96, latitude: 8.43 },
  { name: 'นครสวรรค์', longitude: 100.12, latitude: 15.7 },
  { name: 'นนทบุรี', longitude: 100.51, latitude: 13.86 },
  { name: 'นราธิวาส', longitude: 101.82, latitude: 6.43 },
  { name: 'น่าน', longitude: 100.77, latitude: 18.78 },
  { name: 'บึงกาฬ', longitude: 103.65, latitude: 18.36 },
  { name: 'บุรีรัมย์', longitude: 103.1, latitude: 14.99 },
  { name: 'ปทุมธานี', longitude: 100.53, latitude: 14.02 },
  { name: 'ประจวบคีรีขันธ์', longitude: 99.8, latitude: 11.81 },
  { name: 'ปราจีนบุรี', longitude: 101.37, latitude: 14.05 },
  { name: 'ปัตตานี', longitude: 101.25, latitude: 6.87 },
  { name: 'พระนครศรีอยุธยา', longitude: 100.57, latitude: 14.35 },
  { name: 'พะเยา', longitude: 99.9, latitude: 19.17 },
  { name: 'พังงา', longitude: 98.53, latitude: 8.45 },
  { name: 'พัทลุง', longitude: 100.08, latitude: 7.62 },
  { name: 'พิจิตร', longitude: 100.35, latitude: 16.44 },
  { name: 'พิษณุโลก', longitude: 100.26, latitude: 16.82 },
  { name: 'เพชรบุรี', longitude: 99.95, latitude: 13.11 },
  { name: 'เพชรบูรณ์', longitude: 101.16, latitude: 16.42 },
  { name: 'แพร่', longitude: 100.14, latitude: 18.14 },
  { name: 'ภูเก็ต', longitude: 98.39, latitude: 7.88 },
  { name: 'มหาสารคาม', longitude: 103.3, latitude: 16.18 },
  { name: 'มุกดาหาร', longitude: 104.72, latitude: 16.54 },
  { name: 'แม่ฮ่องสอน', longitude: 97.97, latitude: 19.3 },
  { name: 'ยโสธร', longitude: 104.15, latitude: 15.79 },
  { name: 'ยะลา', longitude: 101.28, latitude: 6.54 },
  { name: 'ร้อยเอ็ด', longitude: 103.65, latitude: 16.05 },
  { name: 'ระนอง', longitude: 98.64, latitude: 9.96 },
  { name: 'ระยอง', longitude: 101.25, latitude: 12.68 },
  { name: 'ราชบุรี', longitude: 99.81, latitude: 13.53 },
  { name: 'ลพบุรี', longitude: 100.65, latitude: 14.8 },
  { name: 'ลำปาง', longitude: 99.49, latitude: 18.29 },
  { name: 'ลำพูน', longitude: 99.01, latitude: 18.58 },
  { name: 'เลย', longitude: 101.72, latitude: 17.49 },
  { name: 'ศรีสะเกษ', longitude: 104.32, latitude: 15.12 },
  { name: 'สกลนคร', longitude: 104.15, latitude: 17.16 },
  { name: 'สงขลา', longitude: 100.6, latitude: 7.19 },
  { name: 'สตูล', longitude: 100.07, latitude: 6.62 },
  { name: 'สมุทรปราการ', longitude: 100.6, latitude: 13.6 },
  { name: 'สมุทรสงคราม', longitude: 100.0, latitude: 13.41 },
  { name: 'สมุทรสาคร', longitude: 100.27, latitude: 13.55 },
  { name: 'สระแก้ว', longitude: 102.07, latitude: 13.82 },
  { name: 'สระบุรี', longitude: 100.91, latitude: 14.53 },
  { name: 'สิงห์บุรี', longitude: 100.4, latitude: 14.89 },
  { name: 'สุโขทัย', longitude: 99.82, latitude: 17.01 },
  { name: 'สุพรรณบุรี', longitude: 100.12, latitude: 14.47 },
  { name: 'สุราษฎร์ธานี', longitude: 99.32, latitude: 9.14 },
  { name: 'สุรินทร์', longitude: 103.49, latitude: 14.88 },
  { name: 'หนองคาย', longitude: 102.74, latitude: 17.88 },
  { name: 'หนองบัวลำภู', longitude: 102.44, latitude: 17.2 },
  { name: 'อ่างทอง', longitude: 100.45, latitude: 14.59 },
  { name: 'อำนาจเจริญ', longitude: 104.63, latitude: 15.86 },
  { name: 'อุดรธานี', longitude: 102.79, latitude: 17.41 },
  { name: 'อุตรดิตถ์', longitude: 100.1, latitude: 17.63 },
  { name: 'อุทัยธานี', longitude: 100.02, latitude: 15.38 },
  { name: 'อุบลราชธานี', longitude: 104.86, latitude: 15.24 },
]

export function findProvince(name: string): ProvinceCoord | undefined {
  const q = name.trim()
  return (
    THAI_PROVINCES.find((p) => p.name === q) ??
    THAI_PROVINCES.find((p) => p.name.includes(q) || q.includes(p.name))
  )
}
