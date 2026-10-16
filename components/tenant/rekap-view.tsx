'use client'
import { Pill } from '@/components/pill'
import { StatCard } from '@/components/stat-card'
import { rupiah } from '@/lib/rupiah'
import type { OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTenant } from './tenant-provider'
import type { TenantRecap } from '@/lib/tenant-orders'

// Sama dengan view tenant_daily_revenue: hanya pesanan lunas yang belum ditolak.
const COUNTED: OrderStatus[] = ['paid', 'accepted', 'ready', 'completed']

const statusPill: Partial<Record<OrderStatus, { label: string; tone: 'neutral' | 'brand' | 'danger' | 'warn' }>> = {
  paid: { label: 'Baru', tone: 'warn' },
  accepted: { label: 'Dimasak', tone: 'neutral' },
  ready: { label: 'Siap', tone: 'brand' },
  completed: { label: 'Selesai', tone: 'neutral' },
  cancelled: { label: 'Ditolak', tone: 'danger' },
}

export function RekapView({ recap }: { recap: TenantRecap }) {
  const { tenant } = useTenant()
  const { orders, gross, canteenShare, tenantShare, orderCount } = recap
  const counted = orders.filter((o) => COUNTED.includes(o.status))
  const rejected = orders.filter((o) => o.status === 'cancelled').length

  const sold = new Map<string, number>()
  for (const o of counted) for (const i of o.items) sold.set(i.name, (sold.get(i.name) ?? 0) + i.quantity)
  const topItems = [...sold].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const rows = orders.filter((o) => o.status in statusPill).sort((a, b) => a.ageMin - b.ageMin)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-base text-ink-2">{recap.dateLabel} · WIB</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Uang masuk hari ini</h1>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Omzet kotor" value={rupiah(gross)} />
          <StatCard label={`Bagian pengelola (${tenant.sharePercent}%)`} value={rupiah(canteenShare)} />
          <StatCard label="Bagian kamu" value={rupiah(tenantShare)} tone="brand" />
          <StatCard label="Jumlah pesanan" value={orderCount} hint={rejected > 0 ? `${rejected} ditolak, tidak dihitung` : undefined} />
        </div>
        <p className="text-sm text-muted-foreground">Pesanan yang ditolak tidak dihitung. Pesanan yang masih diproses ikut dihitung karena sudah dibayar.</p>
      </div>

      <section aria-labelledby="terlaris" className="flex flex-col gap-2">
        <h2 id="terlaris" className="text-lg font-bold">
          Menu terlaris hari ini
        </h2>
        {topItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-base text-muted-foreground">Belum ada yang terjual hari ini.</p>
        ) : (
          <ol className="grid gap-2 lg:grid-cols-3">
            {topItems.map(([name, qty], i) => (
              <li key={name} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-extrabold text-accent-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 text-lg font-semibold">{name}</span>
                <span className="text-base font-bold text-ink-2">{qty} terjual</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="daftar-pesanan" className="flex flex-col gap-2">
        <h2 id="daftar-pesanan" className="text-lg font-bold">
          Semua pesanan hari ini
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-base text-muted-foreground">Belum ada pesanan masuk hari ini.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-176 text-left text-base">
              <thead className="border-b bg-muted/60 text-sm font-bold text-ink-2">
                <tr>
                  <th scope="col" className="px-4 py-2">No.</th>
                  <th scope="col" className="px-4 py-2">Jam</th>
                  <th scope="col" className="px-4 py-2">Pembeli</th>
                  <th scope="col" className="px-4 py-2">Item</th>
                  <th scope="col" className="px-4 py-2 text-right">Total</th>
                  <th scope="col" className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((o) => {
                  const pill = statusPill[o.status]!
                  const struck = o.status === 'cancelled'
                  return (
                    <tr key={o.id} className="align-top">
                      <td className={cn('px-4 py-3 font-bold', struck && 'text-muted-foreground line-through')}>{o.number}</td>
                      <td className={cn('px-4 py-3', struck && 'text-muted-foreground line-through')}>{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(o.paidAt))}</td>
                      <td className={cn('px-4 py-3', struck && 'text-muted-foreground line-through')}>{o.customerName}</td>
                      <td className={cn('px-4 py-3', struck && 'text-muted-foreground line-through')}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', struck && 'text-muted-foreground line-through')}>{rupiah(o.subtotal)}</td>
                      <td className="px-4 py-3">
                        <Pill tone={pill.tone}>{pill.label}</Pill>
                        {struck && o.cancelReason && <div className="mt-1 text-sm text-muted-foreground">{o.cancelReason}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
