import type { Metadata } from 'next'
import { AdminShell, type AdminSearchParams } from '@/components/admin/admin-shell'
import { TenantManager } from '@/components/admin/tenant-manager'

export const metadata: Metadata = { title: 'Tenant' }

export default function AdminTenantPage({ searchParams }: { searchParams: AdminSearchParams }) {
  return (
    <AdminShell section="tenant" searchParams={searchParams}>
      <TenantManager />
    </AdminShell>
  )
}
