import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { Cashier } from '@/components/admin/cashier'

export const metadata: Metadata = { title: 'Kasir' }

export default function AdminCashierPage() {
  return (
    <AdminShell section="kasir">
      <Cashier />
    </AdminShell>
  )
}
