'use client'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTenant } from './tenant-provider'

// Peramban hanya mengizinkan bunyi setelah ada ketukan. Tanpa gerbang ini tablet diam saat pesanan masuk.
export function StartGate() {
  const { orders, start } = useTenant()
  const summary = [
    { label: 'Baru', count: orders.filter((o) => o.status === 'paid').length },
    { label: 'Dimasak', count: orders.filter((o) => o.status === 'accepted').length },
    { label: 'Siap', count: orders.filter((o) => o.status === 'ready').length },
  ]
  return (
    <section className="mx-auto mt-4 flex max-w-xl flex-col items-center gap-5 rounded-xl border bg-card p-8 text-center lg:mt-10">
      <div className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-accent-foreground">
        <Store className="size-8" aria-hidden />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Siap jualan hari ini?</h1>
      <p className="text-lg text-ink-2">Ketuk tombol di bawah supaya tablet berbunyi saat ada pesanan baru dan layarnya tidak mati sendiri.</p>
      <dl className="grid w-full grid-cols-3 gap-2">
        {summary.map(({ label, count }) => (
          <div key={label} className="flex flex-col-reverse rounded-lg bg-muted px-2 py-3">
            <dt className="text-sm font-medium text-ink-2">{label}</dt>
            <dd className="text-3xl font-extrabold">{count}</dd>
          </div>
        ))}
      </dl>
      <Button size="lg" className="h-16 w-full text-xl" onClick={start}>
        Mulai Terima Pesanan
      </Button>
    </section>
  )
}
