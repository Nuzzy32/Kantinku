import 'server-only'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { readTenantOrders } from '@/lib/tenant-order-data'

export async function getTenantOrders(now = new Date(), todayOnly = false) {
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  return readTenantOrders(db, profile.tenant_id!, now, todayOnly)
}

export async function getTenantRecap(now = new Date()) {
  const result = await getTenantOrders(now, true)
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const { data, error } = await db.from('tenant_daily_revenue').select('gross, canteen_share, tenant_share, order_count')
    .eq('tenant_id', profile.tenant_id!).eq('day', result.day).maybeSingle()
  if (error) throw new Error('Rekap belum bisa dimuat.', { cause: error })
  return { ...result, gross: data?.gross ?? 0, canteenShare: data?.canteen_share ?? 0, tenantShare: data?.tenant_share ?? 0, orderCount: data?.order_count ?? 0 }
}
export type TenantRecap = Awaited<ReturnType<typeof getTenantRecap>>
