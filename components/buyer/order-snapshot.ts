import { menuItems, tenants } from '@/lib/mock'
import type { OrderItem, TenantSummary } from '@/lib/types'
import { groupByTenant, type BuyerLine } from './buyer-cart'

// Salinan beku isi pesanan saat dibayar. Keranjang dikosongkan begitu masuk fase Status.
export type SnapshotGroup = { tenant: TenantSummary; number: string; items: OrderItem[]; subtotal: number; cancelReason?: string }
export type Snapshot = { total: number; groups: SnapshotGroup[] }

// Nomor antrean contoh per tenant. Nomor asli dibuat database (Story 3).
const serial: Record<number, number> = { 3: 45, 7: 42, 9: 18, 5: 7 }

export function buildSnapshot(lines: BuyerLine[]): Snapshot {
  const groups = groupByTenant(lines).map(({ tenant, lines: tenantLines }) => ({
    tenant,
    number: `${tenant.code}-${String(serial[tenant.id] ?? 1).padStart(3, '0')}`,
    items: tenantLines.map((l) => ({ quantity: l.quantity, name: l.item.name, note: l.note || undefined })),
    subtotal: tenantLines.reduce((a, l) => a + l.item.price * l.quantity, 0),
  }))
  return { total: groups.reduce((a, g) => a + g.subtotal, 0), groups }
}

// Dipakai bila halaman dibuka tanpa keranjang (mis. dimuat ulang atau langsung ke /order/demo).
const pick = (id: number, quantity: number, note = ''): BuyerLine[] => {
  const item = menuItems.find((i) => i.id === id)
  const tenant = tenants.find((t) => t.id === item?.tenantId)
  return item && tenant ? [{ item, tenant, quantity, note }] : []
}
export const demoSnapshot = buildSnapshot([...pick(6, 1, 'Tanpa seledri'), ...pick(8, 1), ...pick(9, 2)])
