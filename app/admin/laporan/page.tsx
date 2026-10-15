import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { ReportView } from '@/components/admin/report-view'

export const metadata: Metadata = { title: 'Laporan' }

export default function AdminReportPage() {
  return (
    <AdminShell section="laporan">
      <ReportView />
    </AdminShell>
  )
}
