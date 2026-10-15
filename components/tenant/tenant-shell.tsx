'use client'
import { Suspense, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ClipboardList, LogOut, ReceiptText, UtensilsCrossed, WifiOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { buttonVariants } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { signOut } from '@/app/actions/auth'
import { setShopOpen as saveShopOpen } from '@/app/tenant/(app)/actions'
import { cn } from '@/lib/utils'
import { useTenant } from './tenant-provider'

const tabs = [
  { href: '/tenant', label: 'Antrean', icon: ClipboardList },
  { href: '/tenant/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/tenant/rekap', label: 'Rekap', icon: ReceiptText },
]

// Hanya untuk melihat tampilannya: /tenant?offline=1. Pengambilan ulang data sungguhan dikerjakan di story Supabase.
function OfflineBanner() {
  if (useSearchParams().get('offline') !== '1') return null
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-base font-semibold text-primary-foreground">
      <WifiOff className="size-5 shrink-0" aria-hidden />
      Koneksi terputus. Mengambil ulang data setiap 10 detik…
    </div>
  )
}

function ShopSwitch() {
  const { shopOpen, setShopOpen } = useTenant()
  const toast = useToast()
  const saving = useRef(false)
  const [pending, setPending] = useState(false)
  // Satu penyimpanan pada satu waktu supaya respons lambat tidak membalik status terbaru.
  const save = async (open: boolean) => {
    if (saving.current) return 'Status toko sedang disimpan.'
    saving.current = true
    setPending(true)
    const previous = shopOpen
    setShopOpen(open)
    try {
      const { error } = await saveShopOpen(open)
      if (error) setShopOpen(previous)
      return error
    } catch {
      setShopOpen(previous)
      return 'Gagal mengubah status toko. Coba lagi.'
    } finally {
      saving.current = false
      setPending(false)
    }
  }
  const change = async (open: boolean) => {
    const error = await save(open)
    if (error) return toast(error)
    // Tutup tak sengaja (tangan basah) harus mudah dibatalkan.
    if (open) toast('Toko dibuka. Pembeli bisa memesan.')
    else toast('Toko ditutup. Pembeli tidak bisa memesan.', { label: 'Urungkan', onClick: () => void save(true).then((e) => e && toast(e)) })
  }
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2">
      <Switch checked={shopOpen} onCheckedChange={change} disabled={pending} aria-label="Buka toko" aria-busy={pending} />
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-medium text-muted-foreground">Toko</span>
        <span className={cn('text-base font-extrabold', shopOpen ? 'text-primary' : 'text-destructive')}>{shopOpen ? 'BUKA' : 'TUTUP'}</span>
      </span>
    </label>
  )
}

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { tenant, newCount, shopOpen } = useTenant()
  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:font-semibold focus:ring-3 focus:ring-ring/50"
      >
        Lewati ke konten
      </a>
      <div className="sticky top-0 z-30">
        <Suspense fallback={null}>
          <OfflineBanner />
        </Suspense>
        <header className="border-b bg-card">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-1 text-sm font-extrabold text-primary-foreground">{tenant.code}</span>
              <span className="truncate text-base font-bold">{tenant.name}</span>
            </div>
            <nav aria-label="Layar tenant" className="ml-2 flex h-full items-stretch lg:ml-4">
              {tabs.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 border-b-4 px-3 text-base font-semibold outline-none focus-visible:bg-muted lg:px-4',
                      active ? 'border-primary font-bold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                    {href === '/tenant' && newCount > 0 && (
                      <span className="min-w-6 rounded-full bg-primary px-1.5 text-center text-sm font-bold text-primary-foreground">
                        {newCount}
                        <span className="sr-only"> pesanan baru</span>
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <ShopSwitch />
              <span className="h-8 w-px bg-border" aria-hidden />
              <form action={signOut.bind(null, '/tenant/login')}>
                <button type="submit" aria-label="Keluar" title="Keluar" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
                  <LogOut className="size-5" aria-hidden />
                </button>
              </form>
            </div>
          </div>
        </header>
        {!shopOpen && (
          <div role="status" className="bg-warn-soft px-4 py-2 text-center text-base font-semibold text-warn">
            Toko sedang TUTUP. Pembeli tidak bisa memesan sampai kamu membukanya lagi.
          </div>
        )}
      </div>
      <main id="konten" className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">
        {children}
      </main>
    </>
  )
}
