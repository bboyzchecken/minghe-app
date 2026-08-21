// หน้า login เป็น client component จึง export metadata เองไม่ได้ — วางไว้ที่ layout แทน
export const metadata = { title: 'เข้าสู่ระบบ' }

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
