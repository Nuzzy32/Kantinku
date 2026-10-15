import type { Metadata } from 'next'
import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = { title: 'Masuk tenant' }

export default function TenantLoginPage() {
  return <LoginForm title="Masuk tenant" subtitle="Lihat pesanan masuk dan kelola menu tokomu." />
}
