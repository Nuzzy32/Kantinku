import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { RowTh, TableWrap, Td, Th } from '@/components/admin/data-table'
import { RefundStatCard } from '@/components/admin/refund-stat-card'
import { Pill } from '@/components/pill'
import { StatCard } from '@/components/stat-card'
import { getAdminDashboard } from '@/lib/admin-dashboard'
import { rupiah } from '@/lib/rupiah'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboardPage() {
  const { rows, totalGross, totalOrders, totalActive, refundCount, dateLabel } = await getAdminDashboard()
  const maxGross = Math.max(1, ...rows.map((r) => r.gross))

  return (
    <AdminShell section="dashboard">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{dateLabel} · WIB</p>
        </div>

        <section aria-label="Ringkasan hari ini" className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Omzet hari ini" value={rupiah(totalGross)} hint={`${totalOrders} pesanan, tanpa yang ditolak`} />
          <StatCard label="Pesanan aktif" value={totalActive} hint="Sudah dibayar, belum diambil · semua tanggal" />
          <RefundStatCard count={refundCount} />
        </section>

        <section aria-labelledby="per-tenant" className="flex flex-col gap-3">
          <h2 id="per-tenant" className="text-lg font-bold">Per tenant hari ini</h2>
          <TableWrap caption="Status, jumlah pesanan, dan omzet hari ini per tenant">
            <thead>
              <tr>
                <Th>Kode</Th>
                <Th>Tenant</Th>
                <Th>Status</Th>
                <Th right>Pesanan</Th>
                <Th>Omzet</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tenant, orders, gross }) => (
                <tr key={tenant.id} className="border-b last:border-b-0">
                  <RowTh>{tenant.code}</RowTh>
                  <Td className="font-medium">{tenant.name}</Td>
                  <Td>
                    <Pill tone={tenant.is_active && tenant.is_open ? 'brand' : 'neutral'}>
                      {!tenant.is_active ? 'Nonaktif' : tenant.is_open ? 'Buka' : 'Tutup'}
                    </Pill>
                  </Td>
                  <Td right>{orders}</Td>
                  <Td className="min-w-64">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(gross / maxGross) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right font-semibold">{rupiah(gross)}</span>
                    </div>
                  </Td>
                </tr>
              ))}
              {!rows.length && <tr><Td colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada tenant di kantin ini.</Td></tr>}
            </tbody>
          </TableWrap>
        </section>
      </div>
    </AdminShell>
  )
}
