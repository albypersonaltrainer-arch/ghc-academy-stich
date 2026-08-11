import type { ReactNode } from 'react'
import AdminOpsRail from './AdminOpsRail'

export default function ControlCenterLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminOpsRail />
    </>
  )
}
