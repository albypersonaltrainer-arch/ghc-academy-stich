import { Suspense } from 'react'
import type { ReactNode } from 'react'
import AdminOpsRail from './AdminOpsRail'

export default function ControlCenterLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <AdminOpsRail />
      </Suspense>
    </>
  )
}
