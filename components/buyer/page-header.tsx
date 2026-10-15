import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Header halaman dalam ala ESB: putih, bayangan tipis, panah kembali kiri, judul tengah.
// <h1> bisa difokuskan (tabIndex -1) supaya layar yang ganti fase bisa memindahkan fokus ke judul barunya.
export function PageHeader({ title, subtitle, backHref, backLabel = 'Kembali' }: {
  title: string
  subtitle?: string
  backHref: string
  backLabel?: string
}) {
  return (
    <header className="sticky top-0 z-30 grid min-h-14 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1 bg-card px-2 py-1 shadow-sm">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="grid size-11 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-5" />
      </Link>
      <div className="min-w-0 text-center">
        <h1 tabIndex={-1} className="truncate text-base leading-tight font-bold outline-none">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <span aria-hidden />
    </header>
  )
}
