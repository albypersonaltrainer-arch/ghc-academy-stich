'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AdminMfaGate() {
  const pathname = usePathname() || ''
  const router = useRouter()

  useEffect(() => {
    if (!pathname.startsWith('/ghc-control-center') || pathname === '/ghc-control-center/mfa') return

    let active = true

    const enforce = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user || !active) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = String(profile?.role || '').toLowerCase()
      if (!['admin', 'superadmin', 'owner'].includes(role) || !active) return

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error || !active) return

      if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        router.replace('/ghc-control-center/mfa')
      }
    }

    void enforce()
    return () => { active = false }
  }, [pathname, router])

  return null
}
