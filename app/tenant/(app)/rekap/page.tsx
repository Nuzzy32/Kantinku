import type { Metadata } from 'next'
import { RekapView } from '@/components/tenant/rekap-view'

export const metadata: Metadata = { title: 'Rekap' }

export default function TenantRekapPage() {
  return <RekapView />
}
