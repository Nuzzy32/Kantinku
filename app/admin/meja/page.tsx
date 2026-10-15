import type { Metadata } from 'next'
import { AdminShell, type AdminSearchParams } from '@/components/admin/admin-shell'
import { TableManager } from '@/components/admin/table-manager'

export const metadata: Metadata = { title: 'Meja & QR' }

export default function AdminTablesPage({ searchParams }: { searchParams: AdminSearchParams }) {
  return (
    <AdminShell section="meja" searchParams={searchParams}>
      <TableManager />
    </AdminShell>
  )
}
