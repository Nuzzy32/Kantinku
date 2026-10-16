import type { Metadata } from 'next'
import { getTenantRecap } from '@/lib/tenant-orders'
import { RekapView } from '@/components/tenant/rekap-view'

export const metadata: Metadata = { title: 'Rekap' }

export default async function TenantRekapPage() {
  const recap = await getTenantRecap()
  return <RekapView recap={recap} />
}
