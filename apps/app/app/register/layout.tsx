// หน้า register เป็น client component จึง export metadata เองไม่ได้ — วางไว้ที่ layout แทน
export const metadata = { title: 'สมัครสมาชิก' }

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
