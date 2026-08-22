'use client'

import { WorkspaceShell, jobseekerNav } from '@/components/workspace/shell'
import { UserBillingPage } from '@/components/workspace/user-billing'

export default function JobSeekerBillingPage() {
  return (
    <WorkspaceShell nav={jobseekerNav} brand="บัญชีคนทำงาน" requirePath="/jobseeker/billing">
      <UserBillingPage side="jobseeker" />
    </WorkspaceShell>
  )
}
