/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prototype แบบ static ล้วน — ไม่มี API/DB/server
  // `next build` จะ export เป็นไฟล์ static ใน ./out ใช้ deploy ได้ทั้ง Vercel และ Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // ใช้ซอร์ส TypeScript ของ workspace โดยตรง (คำนวณปาจือ + ประกอบรายงานฝั่ง client)
  transpilePackages: ['@minghe/core', '@minghe/report'],
}

export default nextConfig
