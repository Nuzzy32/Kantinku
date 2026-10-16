import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { getCashier } from '@/lib/cashier'
import { Cashier } from '@/components/admin/cashier'

export const metadata: Metadata = { title: 'Kasir' }

export default async function AdminCashierPage() {
  const data = await getCashier()
  return (
    <AdminShell section="kasir">
      <Cashier {...data} />
    </AdminShell>
  )
}
