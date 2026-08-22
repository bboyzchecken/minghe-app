'use client'

import { WorkspaceShell, jobseekerNav } from '@/components/workspace/shell'
import { UserProfilePage } from '@/components/workspace/user-profile'

export default function JobSeekerProfilePage() {
  return (
    <WorkspaceShell nav={jobseekerNav} brand="บัญชีคนทำงาน" requirePath="/jobseeker/profile">
      <UserProfilePage side="jobseeker" />
    </WorkspaceShell>
  )
}
