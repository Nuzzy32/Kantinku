import { TenantProvider } from '@/components/tenant/tenant-provider'
import { TenantShell } from '@/components/tenant/tenant-shell'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// Route group (app): rangka tenant membungkus /tenant, /tenant/menu, /tenant/rekap, tetapi tidak /tenant/login.
// Hanya peran tenant; admin/kasir diarahkan ke halamannya sendiri.
export default async function TenantAppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const { data: t, error } = await db
    .from('tenants')
    .select('id, code, name, is_open, revenue_share_percent')
    .eq('id', profile.tenant_id!) // check di profiles: peran tenant selalu punya tenant_id
    .single()
  if (error) throw error
  const tenant = { id: t.id, code: t.code, name: t.name, isOpen: t.is_open, sharePercent: Number(t.revenue_share_percent) }
  return (
    <TenantProvider tenant={tenant}>
      <TenantShell>{children}</TenantShell>
    </TenantProvider>
  )
}
