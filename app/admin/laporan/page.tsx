import type { Metadata } from 'next'
import { AdminShell, type AdminSearchParams } from '@/components/admin/admin-shell'
import { ReportView } from '@/components/admin/report-view'

export const metadata: Metadata = { title: 'Laporan' }

export default function AdminReportPage({ searchParams }: { searchParams: AdminSearchParams }) {
  return (
    <AdminShell section="laporan" searchParams={searchParams}>
      <ReportView />
    </AdminShell>
  )
}
