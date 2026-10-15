import type { Metadata } from 'next'
import { AdminShell, type AdminSearchParams } from '@/components/admin/admin-shell'
import { RowTh, TableWrap, Td, Th } from '@/components/admin/data-table'
import { RefundStatCard } from '@/components/admin/refund-stat-card'
import { Pill } from '@/components/pill'
import { StatCard } from '@/components/stat-card'
import { myTenantId, tenantOrders, tenants, todayOthers } from '@/lib/mock'
import { rupiah } from '@/lib/rupiah'
import type { OrderStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Dashboard' }

// Sama dengan view tenant_daily_revenue: pesanan yang ditolak tidak dihitung.
const COUNTED: OrderStatus[] = ['paid', 'accepted', 'ready', 'completed']
// Sudah dibayar tapi belum diambil pembeli.
const ACTIVE: OrderStatus[] = ['paid', 'accepted', 'ready']

export default function AdminDashboardPage({ searchParams }: { searchParams: AdminSearchParams }) {
  // T7 dihitung dari tenantOrders, tenant lain dari todayOthers (lihat lib/mock.ts).
  const counted = tenantOrders.filter((o) => COUNTED.includes(o.status))
  const rows = tenants
    .filter((t) => t.isActive)
    .map((t) => {
      const mine = t.id === myTenantId
      const other = todayOthers[t.id] ?? { orders: 0, gross: 0, active: 0 }
      return {
        tenant: t,
        orders: mine ? counted.length : other.orders,
        gross: mine ? counted.reduce((a, o) => a + o.subtotal, 0) : other.gross,
        active: mine ? tenantOrders.filter((o) => ACTIVE.includes(o.status)).length : other.active,
      }
    })
    .sort((a, b) => b.gross - a.gross)

  const totalGross = rows.reduce((a, r) => a + r.gross, 0)
  const totalOrders = rows.reduce((a, r) => a + r.orders, 0)
  const totalActive = rows.reduce((a, r) => a + r.active, 0)
  const maxGross = Math.max(1, ...rows.map((r) => r.gross))

  return (
    <AdminShell section="dashboard" searchParams={searchParams}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Kamis, 15 Oktober 2026 · WIB</p>
        </div>

        <section aria-label="Ringkasan hari ini" className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Omzet hari ini" value={rupiah(totalGross)} hint={`${totalOrders} pesanan, tanpa yang ditolak`} />
          <StatCard label="Pesanan aktif" value={totalActive} hint="Sudah dibayar, belum diambil pembeli" />
          <RefundStatCard />
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
                    <Pill tone={tenant.isOpen ? 'brand' : 'neutral'}>{tenant.isOpen ? 'Buka' : 'Tutup'}</Pill>
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
            </tbody>
          </TableWrap>
        </section>
      </div>
    </AdminShell>
  )
}
