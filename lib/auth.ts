import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export type Role = Database['public']['Enums']['user_role']

// Halaman awal tiap peran. Dipakai setelah login dan saat peran membuka area yang bukan miliknya.
export const homeOf: Record<Role, string> = { tenant: '/tenant', admin: '/admin', cashier: '/admin/kasir' }

// Profil staf yang sedang login, atau null. cache(): satu kali per request walau dipanggil layout dan halaman.
export const getProfile = cache(async () => {
  const db = await createClient()
  const { data } = await db.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) return null
  const { data: profile } = await db.from('profiles').select('id, role, canteen_id, tenant_id, full_name').eq('id', uid).maybeSingle()
  return profile
})

// Penjaga halaman: belum login -> login area itu; peran lain -> halaman awal perannya.
export async function requireRole(allowed: Role[], loginPath: string) {
  const profile = await getProfile()
  if (!profile) redirect(loginPath)
  if (!allowed.includes(profile.role)) redirect(homeOf[profile.role])
  return profile
}
