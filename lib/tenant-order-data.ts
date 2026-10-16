import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { readAll } from '@/lib/supabase/read-all'
import type { TenantOrder } from '@/lib/types'

export type LiveTenantOrder = TenantOrder & { id: number; paidAt: string }

export async function readTenantOrders(db: SupabaseClient<Database>, tenantId: number, now = new Date(), todayOnly = false) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const start = new Date(`${day}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 86_400_000)
  const rows = await readAll((from, to) => {
    let query = db.from('orders').select('id, status, subtotal, cancel_reason, paid_at, tenant:tenants!inner(code), checkout:checkouts!inner(customer_name, service_type, payment_method, dining_table:dining_tables(label)), items:order_items(id, name, quantity, note)')
      .eq('tenant_id', tenantId).order('paid_at').order('id')
    // Antrean lama tetap terlihat setelah tengah malam sampai diambil; rekap mengikuti tanggal pembayaran WIB.
    query = todayOnly ? query.gte('paid_at', start.toISOString()).lt('paid_at', end.toISOString()) : query.in('status', ['paid', 'accepted', 'ready'])
    return query.range(from, to)
  })
  const orders: LiveTenantOrder[] = rows.map((o) => ({
    id: o.id, number: `${o.tenant.code}-${String(o.id % 1000).padStart(3, '0')}`,
    customerName: o.checkout.customer_name, tableLabel: o.checkout.dining_table?.label ?? null,
    serviceType: o.checkout.service_type, paymentMethod: o.checkout.payment_method,
    items: o.items.sort((a, b) => a.id - b.id).map((i) => ({ name: i.name, quantity: i.quantity, ...(i.note && { note: i.note }) })),
    status: o.status, subtotal: o.subtotal, cancelReason: o.cancel_reason ?? undefined,
    paidAt: o.paid_at!, ageMin: Math.max(0, Math.floor((now.getTime() - new Date(o.paid_at!).getTime()) / 60_000)),
  }))
  return { orders, day, dateLabel: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now) }
}
