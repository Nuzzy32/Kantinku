import type { TenantOrder } from '@/lib/types'

// Total item yang harus dimasak sekarang: kolom Baru + Dimasak.
export function CookSummary({ orders }: { orders: TenantOrder[] }) {
  const totals = new Map<string, number>()
  for (const o of orders) {
    if (o.status !== 'paid' && o.status !== 'accepted') continue
    for (const i of o.items) totals.set(i.name, (totals.get(i.name) ?? 0) + i.quantity)
  }
  if (totals.size === 0) return null
  const rows = [...totals].sort((a, b) => b[1] - a[1])
  return (
    <section aria-label="Ringkasan masak" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border-2 border-primary bg-brand-soft px-4 py-3">
      <h2 className="text-sm font-bold tracking-wide text-accent-foreground uppercase">Ringkasan masak</h2>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {rows.map(([name, qty]) => (
          <li key={name} className="text-xl font-bold after:ml-3 after:font-normal after:text-muted-foreground after:content-['·'] last:after:content-none">
            {name} <span className="text-accent-foreground">×{qty}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
