'use client'

import { WorkspaceShell, employerNav } from '@/components/workspace/shell'
import { UserProfilePage } from '@/components/workspace/user-profile'

export default function EmployerProfilePage() {
  return (
    <WorkspaceShell nav={employerNav} brand="บัญชีองค์กร" requirePath="/employer/profile">
      <UserProfilePage side="employer" />
    </WorkspaceShell>
  )
}
