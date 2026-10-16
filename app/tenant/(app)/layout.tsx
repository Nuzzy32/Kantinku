import { LogOut, Store } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { TenantProvider } from '@/components/tenant/tenant-provider'
import { Button } from '@/components/ui/button'
import { TenantShell } from '@/components/tenant/tenant-shell'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTenantOrders } from '@/lib/tenant-orders'

// Route group (app): rangka tenant membungkus /tenant, /tenant/menu, /tenant/rekap, tetapi tidak /tenant/login.
// Hanya peran tenant; admin/kasir diarahkan ke halamannya sendiri.
export default async function TenantAppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const { data: t, error } = await db
    .from('tenants')
    .select('id, code, name, is_open, revenue_share_percent')
    .eq('id', profile.tenant_id!) // check di profiles: peran tenant selalu punya tenant_id
    .maybeSingle()
  if (error) throw error
  // RLS hanya menampilkan tenant aktif: tidak ada baris = tenant dinonaktifkan pengelola.
  if (!t) return <InactiveNotice />
  const tenant = { id: t.id, code: t.code, name: t.name, isOpen: t.is_open, sharePercent: Number(t.revenue_share_percent) }
  const { orders } = await getTenantOrders()
  return (
    <TenantProvider tenant={tenant} initialOrders={orders}>
      <TenantShell>{children}</TenantShell>
    </TenantProvider>
  )
}

function InactiveNotice() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <Store aria-hidden className="size-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Toko sedang dinonaktifkan</h1>
      <p className="text-ink-2">Pengelola kantin menonaktifkan tokomu, jadi pesanan baru tidak masuk. Hubungi pengelola untuk mengaktifkannya lagi.</p>
      <form action={signOut.bind(null, '/tenant/login')}>
        <Button type="submit" variant="outline" size="lg"><LogOut aria-hidden /> Keluar</Button>
      </form>
    </main>
  )
}
