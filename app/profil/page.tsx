import { ChevronRight, ReceiptText, Store, User, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { menuHref } from '@/components/buyer/canteen'
import { PageHeader } from '@/components/buyer/page-header'

export const metadata: Metadata = { title: 'Profil' }

const links: { href: string; label: string; note: string; icon: LucideIcon }[] = [
  { href: '/order/demo', label: 'Riwayat pesanan', note: 'Lihat status pesananmu', icon: ReceiptText },
  { href: '/info', label: 'Info kantin', note: 'Alamat dan jam operasional', icon: Store },
]

export default function ProfilePage() {
  return (
    <BuyerShell>
      <PageHeader title="Profil" backHref={menuHref} backLabel="Kembali ke menu" />
      <main className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-4">
          <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <User className="size-8" />
          </div>
          <div>
            <p className="text-lg font-bold">Masuk sebagai Tamu</p>
            <p className="text-muted-foreground">Kamu tidak perlu akun untuk memesan.</p>
          </div>
        </div>
        <ul className="flex flex-col gap-3">
          {links.map(({ href, label, note, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-brand-line">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{label}</span>
                  <span className="block text-muted-foreground">{note}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </BuyerShell>
  )
}
