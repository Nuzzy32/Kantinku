import 'server-only'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/read-all'

export async function getAdminDashboard(now = new Date()) {
  const profile = await requireRole(['admin'], '/admin/login')
  const db = await createClient()
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const [canteen, tenants, revenue, active, refunds] = await Promise.all([
    db.from('canteens').select('name').eq('id', profile.canteen_id).single(),
    readAll((from, to) => db.from('tenants').select('id, code, name, is_open, is_active')
      .eq('canteen_id', profile.canteen_id).order('id').range(from, to)),
    readAll((from, to) => db.from('tenant_daily_revenue').select('tenant_id, order_count, gross, tenant:tenants!inner(canteen_id)')
      .eq('tenant.canteen_id', profile.canteen_id).eq('day', day).order('tenant_id').range(from, to)),
    db.from('orders').select('id, tenant:tenants!inner(canteen_id)', { count: 'exact', head: true })
      .eq('tenant.canteen_id', profile.canteen_id).in('status', ['paid', 'accepted', 'ready']),
    db.from('orders').select('id, tenant:tenants!inner(canteen_id)', { count: 'exact', head: true })
      .eq('tenant.canteen_id', profile.canteen_id).eq('refund_status', 'needed'),
  ])
  if (canteen.error || active.error || refunds.error) {
    throw new Error('Dashboard belum bisa dimuat.', { cause: canteen.error ?? active.error ?? refunds.error })
  }
  const revenueByTenant = new Map(revenue.map((r) => [r.tenant_id, r]))
  // Tenant nonaktif tetap disertakan: omzet dan pekerjaan tertundanya tidak boleh hilang.
  const rows = tenants.map((tenant) => {
    const r = revenueByTenant.get(tenant.id)
    return { tenant, orders: r?.order_count ?? 0, gross: r?.gross ?? 0 }
  }).sort((a, b) => b.gross - a.gross || a.tenant.code.localeCompare(b.tenant.code))

  return {
    canteenName: canteen.data.name,
    dateLabel: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now),
    rows,
    totalGross: rows.reduce((sum, r) => sum + r.gross, 0),
    totalOrders: rows.reduce((sum, r) => sum + r.orders, 0),
    totalActive: active.count ?? 0,
    refundCount: refunds.count ?? 0,
  }
}
