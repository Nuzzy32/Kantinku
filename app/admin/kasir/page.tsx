import type { Metadata } from 'next'
import { AdminShell, type AdminSearchParams } from '@/components/admin/admin-shell'
import { Cashier } from '@/components/admin/cashier'

export const metadata: Metadata = { title: 'Kasir' }

export default function AdminCashierPage({ searchParams }: { searchParams: AdminSearchParams }) {
  return (
    <AdminShell section="kasir" searchParams={searchParams}>
      <Cashier />
    </AdminShell>
  )
}
