import { ChevronRight, Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { canteenName, demoTable } from '@/lib/mock'
import { cn } from '@/lib/utils'
import { closesAt, opensAt } from './canteen'

const roundButton =
  'grid size-11 place-items-center rounded-full bg-card text-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'

// Banner ±160px: gradasi krem ke oranye muda, "KantinKu" di kanan, dua tombol bulat putih di kanan atas.
export function MenuBanner({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="relative h-40 shrink-0 overflow-hidden bg-linear-to-br from-accent to-brand-line/30">
      <span aria-hidden className="absolute -top-12 -left-10 size-40 rounded-full bg-card/40" />
      <span aria-hidden className="absolute -right-10 bottom-8 size-36 rounded-full bg-brand-line/10" />
      <div className="absolute top-3 right-3 flex gap-2">
        <button type="button" aria-label="Cari menu" aria-haspopup="dialog" onClick={onSearch} className={roundButton}>
          <Search aria-hidden className="size-5" />
        </button>
        <Link href="/profil" aria-label="Menu dan profil" className={roundButton}>
          <Menu aria-hidden className="size-5" />
        </Link>
      </div>
      <div className="absolute right-4 bottom-4 left-4 text-right">
        <p aria-hidden className="text-4xl leading-none font-extrabold tracking-tight text-primary">KantinKu</p>
        <p aria-hidden className="mt-1.5 text-xs font-medium">{canteenName}</p>
      </div>
    </div>
  )
}

// Seluruh kartu adalah tautan ke /info. Pil: buka = krem, tutup = merah.
export function CanteenCard({ closed }: { closed: boolean }) {
  return (
    <Link
      href="/info"
      className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold">{canteenName}</h1>
        <span
          className={cn(
            'mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-bold',
            closed ? 'bg-destructive text-primary-foreground' : 'bg-accent text-accent-foreground',
          )}
        >
          <span className="uppercase">{closed ? 'Tutup' : 'Buka'}</span>&nbsp;·&nbsp;{closed ? `Buka besok ${opensAt}` : `Tutup ${closesAt}`}
        </span>
        <span className="sr-only">. Lihat info kantin.</span>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function TableBox() {
  return <p className="mt-4 rounded-t-2xl bg-accent py-2.5 text-center text-sm font-medium">Nomor Meja: {demoTable}</p>
}
