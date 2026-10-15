import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { MenuItem, TenantSummary } from '@/lib/types'

export type TableMenu = {
  canteen: { name: string; slug: string; opensAt: string; closesAt: string }
  tableLabel: string
  tenants: TenantSummary[]
  items: MenuItem[]
}

const hhmm = (t: string) => t.slice(0, 5).replace(':', '.') // "08:00:00" -> "08.00"

// Data halaman menu pembeli dari token QR meja. null = token tidak dikenal (halaman "Meja tidak ditemukan").
// Pembeli tidak login: dibaca dengan publishable key, RLS + GRANT kolom membatasi yang terlihat.
export async function getTableMenu(qrToken: string): Promise<TableMenu | null> {
  if (!z.uuid().safeParse(qrToken).success) return null
  const db = await createClient()

  const { data: table, error } = await db
    .from('dining_tables')
    .select('label, canteen:canteens!inner(id, name, slug, open_time, close_time)')
    .eq('qr_token', qrToken)
    .maybeSingle()
  if (error) throw error
  if (!table) return null
  const { canteen } = table

  const [tenantsRes, itemsRes] = await Promise.all([
    db.from('tenants').select('id, code, name, is_open').eq('canteen_id', canteen.id).eq('is_active', true).order('code'),
    db
      .from('menu_items')
      .select('id, tenant_id, name, price, is_available, sort_order, category:menu_categories(name, sort_order), tenant:tenants!inner(canteen_id)')
      .eq('tenant.canteen_id', canteen.id),
  ])
  if (tenantsRes.error) throw tenantsRes.error
  if (itemsRes.error) throw itemsRes.error

  // Urutan tampil: kategori (sort_order), lalu menu (sort_order). Menu tanpa kategori di akhir, "Lainnya".
  const rank = (r: (typeof itemsRes.data)[number]) => [r.category?.sort_order ?? Number.MAX_SAFE_INTEGER, r.sort_order, r.id]
  const items = [...itemsRes.data]
    .sort((a, b) => {
      const [x, y] = [rank(a), rank(b)]
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
    })
    .map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      category: r.category?.name ?? 'Lainnya',
      name: r.name,
      price: r.price,
      isAvailable: r.is_available,
    }))

  return {
    canteen: { name: canteen.name, slug: canteen.slug, opensAt: hhmm(canteen.open_time), closesAt: hhmm(canteen.close_time) },
    tableLabel: table.label,
    tenants: tenantsRes.data.map((t) => ({ id: t.id, code: t.code, name: t.name, isOpen: t.is_open })),
    items,
  }
}
