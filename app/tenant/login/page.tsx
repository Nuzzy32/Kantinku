import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getProfile, homeOf } from '@/lib/auth'

export const metadata: Metadata = { title: 'Masuk tenant' }

export default async function TenantLoginPage() {
  // Sudah login (sesi bertahan): langsung ke halaman awal perannya.
  const profile = await getProfile()
  if (profile) redirect(homeOf[profile.role])
  return <LoginForm title="Masuk tenant" subtitle="Lihat pesanan masuk dan kelola menu tokomu." />
}
