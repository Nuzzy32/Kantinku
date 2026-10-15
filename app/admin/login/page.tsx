import type { Metadata } from 'next'
import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = { title: 'Masuk pengelola' }

export default function AdminLoginPage() {
  return <LoginForm title="Masuk pengelola" subtitle="Untuk pengelola kantin dan kasir." />
}
