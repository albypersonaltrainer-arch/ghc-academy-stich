import { Suspense } from 'react'
import type { ReactNode } from 'react'
import AdminOpsRail from './AdminOpsRail'
import AdminMfaGate from './AdminMfaGate'

export default function ControlCenterLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminMfaGate />
      {children}
      <Suspense fallback={null}>
        <AdminOpsRail />
      </Suspense>
    </>
  )
}
