import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Banknote, ChartColumn, LayoutDashboard, LogOut, QrCode, Store } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { RefundBadge } from './refund-badge'

export type AdminSection = 'dashboard' | 'tenant' | 'meja' | 'kasir' | 'laporan'

const NAV = [
  { section: 'dashboard', href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'tenant', href: '/admin/tenant', label: 'Tenant', icon: Store },
  { section: 'meja', href: '/admin/meja', label: 'Meja & QR', icon: QrCode },
  { section: 'kasir', href: '/admin/kasir', label: 'Kasir', icon: Banknote },
  { section: 'laporan', href: '/admin/laporan', label: 'Laporan', icon: ChartColumn },
] as const

// Rangka halaman pengelola & kasir. Dipakai langsung di tiap page (bukan app/admin/layout.tsx)
// supaya /admin/login tetap tanpa rangka. Peran dari profil: tenant diarahkan ke /tenant, kasir hanya ke Kasir.
export async function AdminShell({ section, children }: { section: AdminSection; children: React.ReactNode }) {
  const profile = await requireRole(['admin', 'cashier'], '/admin/login')
  const isCashier = profile.role === 'cashier'
  if (isCashier && section !== 'kasir') redirect('/admin/kasir')

  // Nama kantin + badge refund di setiap halaman pengelola dari database (RLS: kantin sendiri). Kasir tidak punya menu Laporan.
  const db = await createClient()
  const [canteen, refunds] = await Promise.all([
    db.from('canteens').select('name').eq('id', profile.canteen_id).single(),
    isCashier ? null : db.from('orders').select('id, tenant:tenants!inner(canteen_id)', { count: 'exact', head: true })
      .eq('tenant.canteen_id', profile.canteen_id).eq('refund_status', 'needed'),
  ])
  const canteenName = canteen.data?.name ?? ''
  const refundCount = refunds?.count ?? 0

  const items = isCashier ? NAV.filter((n) => n.section === 'kasir') : NAV
  const role = isCashier ? 'Kasir' : 'Pengelola'

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:font-semibold focus:ring-3 focus:ring-ring/50"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b bg-card print:hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 lg:px-6">
          <div className="mr-auto flex min-h-11 items-center gap-3 lg:mr-0">
            <span className="text-lg font-extrabold tracking-tight text-primary">KantinKu</span>
            <span className="hidden text-sm text-muted-foreground xl:inline">{role} · {canteenName}</span>
          </div>
          <nav aria-label="Menu utama" className="order-last -mx-1 w-full overflow-x-auto lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:overflow-visible">
            <ul className="flex gap-1 px-1 lg:pl-4">
              {items.map(({ section: s, href, label, icon: Icon }) => {
                const active = s === section
                return (
                  <li key={s}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        active ? 'bg-accent font-bold text-accent-foreground' : 'text-ink-2 hover:bg-muted',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                      {s === 'laporan' && <RefundBadge count={refundCount} />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <div className="text-sm font-semibold">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            <form action={signOut.bind(null, '/admin/login')}>
              <button
                type="submit"
                aria-label="Keluar"
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden md:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none lg:px-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  )
}
