import 'server-only'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/read-all'
import type { MenuItem, TenantSummary } from '@/lib/types'
import type { CashSale } from '@/components/admin/cashier-types'

export async function getCashier() {
  const profile = await requireRole(['admin', 'cashier'], '/admin/login')
  const db = await createClient()
  const [sellers, menu, history] = await Promise.all([
    readAll((from, to) => db.from('tenants').select('id, code, name, is_open')
      .eq('canteen_id', profile.canteen_id).eq('is_active', true).order('id').range(from, to)),
    readAll((from, to) => db.from('menu_items').select('id, tenant_id, name, price, is_available, image_url, category:menu_categories(name), tenant:tenants!inner(canteen_id, is_active)')
      .eq('tenant.canteen_id', profile.canteen_id).eq('tenant.is_active', true).eq('is_active', true).order('id').range(from, to)),
    db.from('checkouts').select('id, created_at, customer_name, service_type, total, cash_received, orders(id, subtotal, tenant:tenants(code, name), order_items(name, quantity))')
      .eq('canteen_id', profile.canteen_id).eq('payment_method', 'cash').eq('payment_status', 'paid').order('id', { ascending: false }).limit(100),
  ])
  if (history.error) throw new Error('Riwayat kasir belum bisa dimuat.')
  // Bagi hasil tidak dikirim ke browser kasir: kasir tidak membutuhkannya.
  const tenants: TenantSummary[] = sellers.map((t) => ({ id: t.id, code: t.code, name: t.name, isOpen: t.is_open }))
  const items: MenuItem[] = menu.map((m) => ({ id: m.id, tenantId: m.tenant_id, name: m.name, price: m.price, category: m.category?.name ?? 'Lainnya', isAvailable: m.is_available, imageUrl: m.image_url }))
  const sales: CashSale[] = history.data.map((c) => ({
    id: c.id, time: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(c.created_at)),
    customerName: c.customer_name, service: c.service_type, total: c.total, received: c.cash_received,
    parts: c.orders.map((o) => ({ number: `${o.tenant.code}-${String(o.id % 1000).padStart(3, '0')}`, tenantName: o.tenant.name, subtotal: o.subtotal, items: o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(', ') })),
  }))
  return { tenants, items, sales }
}
