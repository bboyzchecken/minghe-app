import { AdminWorkspace } from '@/components/workspace/admin-shell'

export const metadata = { title: 'Admin Console' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminWorkspace>{children}</AdminWorkspace>
}
