import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { TableManager } from '@/components/admin/table-manager'

export const metadata: Metadata = { title: 'Meja & QR' }

export default function AdminTablesPage() {
  return (
    <AdminShell section="meja">
      <TableManager />
    </AdminShell>
  )
}
