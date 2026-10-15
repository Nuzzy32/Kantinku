import { Check, CircleCheck } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { rupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'
import { useMenuHref } from './buyer-cart'
import type { Snapshot, SnapshotGroup } from './order-snapshot'

export type DemoStatus = 'paid' | 'accepted' | 'ready' | 'cancelled'

const steps = ['Diterima', 'Dimasak', 'Siap']
const current: Record<Exclude<DemoStatus, 'cancelled'>, number> = { paid: 0, accepted: 1, ready: 2 }
// Status = teks + warna. Pil "Siap" memakai isi hijau penuh: teks hijau di atas hijau muda kurang dari 4,5:1.
const badge = {
  paid: { label: 'Menunggu', className: 'bg-muted text-ink-2' },
  accepted: { label: 'Dimasak', className: 'bg-warn-soft text-warn' },
  ready: { label: 'Siap', className: 'bg-success text-primary-foreground' },
  cancelled: { label: 'Ditolak', className: 'bg-destructive text-primary-foreground' },
} as const
const rejectReason = 'Bahan habis' // alasan contoh untuk mode ?demo=tolak

export function StatusView({ snapshot, statuses }: { snapshot: Snapshot; statuses: Record<number, DemoStatus> }) {
  const menuHref = useMenuHref()
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 bg-success px-4 py-4 text-primary-foreground">
        <CircleCheck aria-hidden className="size-8 shrink-0" />
        <div>
          <p className="text-lg leading-tight font-bold">Lunas · {rupiah(snapshot.total)}</p>
          <p className="text-sm font-medium">Pesanan terkirim</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {snapshot.groups.map((g) => (
          <OrderCard key={g.tenant.id} group={g} status={statuses[g.tenant.id] ?? 'paid'} />
        ))}
        <Link href={menuHref} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-auto rounded-xl border-brand-line font-bold text-primary hover:bg-accent hover:text-accent-foreground')}>
          Pesan lagi
        </Link>
      </div>
    </div>
  )
}

function OrderCard({ group, status }: { group: SnapshotGroup; status: DemoStatus }) {
  const { tenant, number, items } = group
  const idx = status === 'cancelled' ? -1 : current[status]
  const text = {
    paid: `Pesanan sudah masuk. Menunggu ${tenant.name} menerima.`,
    accepted: `Sedang dimasak oleh ${tenant.name}.`,
    ready: `Siap! Ambil di ${tenant.name}, sebut nomor ${number}.`,
    cancelled: `Ditolak: ${rejectReason}.`,
  }[status]

  return (
    <article
      aria-labelledby={`order-${number}`}
      className={cn('rounded-2xl border border-border bg-card p-4', status === 'ready' && 'border-success bg-success-soft', status === 'cancelled' && 'border-destructive bg-danger-soft')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-muted-foreground">{tenant.code} · {tenant.name}</p>
          <p id={`order-${number}`} className="text-2xl font-bold tracking-tight">{number}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-border px-1 text-[11px] font-medium text-muted-foreground uppercase">demo</span>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-bold', badge[status].className)}>{badge[status].label}</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {items.map((it) => (
          <li key={it.name}>
            <span className="font-bold">{it.quantity}×</span> {it.name}
            {it.note && <span className="block text-xs text-muted-foreground">Catatan: {it.note}</span>}
          </li>
        ))}
      </ul>

      {status !== 'cancelled' && (
        <ol aria-label="Progres pesanan" className="mt-4 flex items-start">
          {steps.map((label, i) => {
            const done = i < idx || status === 'ready'
            const now = i === idx && !done
            const green = i === 2 && status === 'ready' // langkah terakhir yang tercapai = hijau
            const reached = i <= idx
            return (
              <li key={label} aria-current={now ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-1 text-center">
                {i > 0 && <span aria-hidden className={cn('absolute top-3.5 right-1/2 h-0.5 w-full', reached ? (green ? 'bg-success' : 'bg-brand-line') : 'bg-line-strong')} />}
                <span
                  className={cn(
                    'relative grid size-7 place-items-center rounded-full border-2 text-xs font-bold',
                    done && (green ? 'border-success bg-success text-primary-foreground' : 'border-brand-line bg-primary text-primary-foreground'),
                    now && 'border-brand-line bg-card text-primary',
                    !done && !now && 'border-line-strong bg-card text-muted-foreground',
                  )}
                >
                  {done ? <Check aria-hidden className="size-4" /> : i + 1}
                </span>
                <span className={cn('text-xs font-semibold', done || now ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                  <span className="sr-only">{done ? ' (selesai)' : now ? ' (sekarang)' : ''}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <p aria-live="polite" className={cn('mt-4 text-base font-semibold', status === 'cancelled' && 'text-destructive')}>{text}</p>
      {status === 'cancelled' && <p className="mt-1 text-sm text-muted-foreground">Uang akan dikembalikan pengelola.</p>}
    </article>
  )
}
