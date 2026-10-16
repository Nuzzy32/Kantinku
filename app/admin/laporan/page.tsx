import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { ReportView } from '@/components/admin/report-view'
import { getAdminReport } from '@/lib/admin-report'

export const metadata: Metadata = { title: 'Laporan' }

export default async function AdminReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const report = await getAdminReport(await searchParams)
  return (
    <AdminShell section="laporan">
      <ReportView report={report} />
    </AdminShell>
  )
}
