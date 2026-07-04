import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@minghe/core', '@minghe/db', '@minghe/report'],
  // ให้ Next.js คัดลอก Prisma query engine (.so.node) ไปกับ serverless function bundle
  // จำเป็นสำหรับ monorepo บน Vercel — ไม่งั้นเจอ "could not locate the Query Engine"
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
    }
    return config
  },
}

export default nextConfig
