import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { TenantManager } from '@/components/admin/tenant-manager'

export const metadata: Metadata = { title: 'Tenant' }

export default function AdminTenantPage() {
  return (
    <AdminShell section="tenant">
      <TenantManager />
    </AdminShell>
  )
}
