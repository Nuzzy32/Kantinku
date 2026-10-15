import type { Metadata } from 'next'
import { MenuManager, type TenantMenuItem } from '@/components/tenant/menu-manager'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Menu' }

export default async function TenantMenuPage() {
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const [itemsRes, catsRes] = await Promise.all([
    db
      .from('menu_items')
      .select('id, name, price, is_available, image_url, sort_order, category:menu_categories(name, sort_order)')
      .eq('tenant_id', profile.tenant_id!)
      .eq('is_active', true)
      .order('sort_order')
      .order('id'),
    db.from('menu_categories').select('name').eq('tenant_id', profile.tenant_id!).order('sort_order'),
  ])
  if (itemsRes.error) throw itemsRes.error
  if (catsRes.error) throw catsRes.error

  const items: TenantMenuItem[] = itemsRes.data
    .toSorted((a, b) => (a.category?.sort_order ?? Infinity) - (b.category?.sort_order ?? Infinity))
    .map((r) => ({ id: r.id, name: r.name, price: r.price, category: r.category?.name ?? 'Lainnya', isAvailable: r.is_available, imageUrl: r.image_url }))
  return <MenuManager items={items} categories={catsRes.data.map((c) => c.name)} />
}
