'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SessionProvider } from '@/lib/session'

/**
 * Provider กลางของทั้งแอป — ลำดับสำคัญ:
 * QueryClientProvider อยู่นอก SessionProvider เพื่อให้ signOut ล้าง cache ของผู้ใช้คนก่อนได้
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // API ตอบ 4xx แล้วลองซ้ำไม่ช่วยอะไร — ลองซ้ำเฉพาะปัญหาเครือข่าย
            retry: (failureCount, error) => {
              const status = (error as { status?: number }).status
              if (status && status >= 400 && status < 500) return false
              return failureCount < 2
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
