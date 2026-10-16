import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { TenantManager, type AdminTenant, type Cashier } from '@/components/admin/tenant-manager'
import { requireRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tenant' }

export default async function AdminTenantPage() {
  const profile = await requireRole(['admin'], '/admin/login')
  const db = await createClient()
  const [tenantsRes, profilesRes, usersRes] = await Promise.all([
    db.from('tenants').select('id, code, name, revenue_share_percent, is_active').eq('canteen_id', profile.canteen_id).order('code'),
    db.from('profiles').select('id, role, tenant_id, full_name').eq('canteen_id', profile.canteen_id),
    // Email ada di auth.users, bukan profiles. ponytail: satu halaman 1000 akun cukup untuk satu kantin; pakai paginasi bila lebih.
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])
  if (tenantsRes.error) throw tenantsRes.error
  if (profilesRes.error) throw profilesRes.error
  if (usersRes.error) throw usersRes.error

  const emailOf = new Map(usersRes.data.users.map((u) => [u.id, u.email ?? '']))
  const loginOf = new Map(profilesRes.data.filter((p) => p.tenant_id).map((p) => [p.tenant_id!, emailOf.get(p.id) ?? '']))
  const tenants: AdminTenant[] = tenantsRes.data.map((t) => ({
    id: t.id, code: t.code, name: t.name, sharePercent: Number(t.revenue_share_percent), isActive: t.is_active, email: loginOf.get(t.id) ?? '',
  }))
  const cashiers: Cashier[] = profilesRes.data
    .filter((p) => p.role === 'cashier')
    .map((p) => ({ id: p.id, name: p.full_name, email: emailOf.get(p.id) ?? '' }))

  return (
    <AdminShell section="tenant">
      <TenantManager tenants={tenants} cashiers={cashiers} />
    </AdminShell>
  )
}
