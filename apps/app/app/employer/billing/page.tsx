'use client'

import { WorkspaceShell, employerNav } from '@/components/workspace/shell'
import { UserBillingPage } from '@/components/workspace/user-billing'

export default function EmployerBillingPage() {
  return (
    <WorkspaceShell nav={employerNav} brand="บัญชีองค์กร" requirePath="/employer/billing">
      <UserBillingPage side="employer" />
    </WorkspaceShell>
  )
}
