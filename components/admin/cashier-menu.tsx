'use client'
import { useState } from 'react'
import { ChevronDown, CircleAlert, Search } from 'lucide-react'
import { Pill } from '@/components/pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MenuItem, TenantSummary } from '@/lib/types'
import { rupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'
import { MAX_QTY } from './cashier-types'

// Tenant nonaktif tidak bisa dipesan (create_checkout menolaknya), tenant tutup tetap tampil terlipat.

export function CashierMenu({ tenants, menuItems, cart, onAdd }: { tenants: TenantSummary[]; menuItems: MenuItem[]; cart: Record<number, number>; onAdd: (id: number) => void }) {
  const sellers = tenants // server hanya mengirim tenant aktif
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<number | null>(null)
  const [opened, setOpened] = useState<number[]>([]) // tenant tutup yang sedang dibuka

  const q = query.trim().toLowerCase()
  const groups = sellers
    .filter((t) => filter === null || t.id === filter)
    .map((tenant) => ({ tenant, items: menuItems.filter((m) => m.tenantId === tenant.id && (!q || m.name.toLowerCase().includes(q))) }))
    .filter((g) => g.items.length > 0 || !q)

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cari-menu">Cari menu</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="cari-menu"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Contoh: mie ayam"
            className="h-14 pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div role="group" aria-label="Filter tenant" className="flex flex-wrap gap-2">
        <Chip active={filter === null} onClick={() => setFilter(null)}>Semua</Chip>
        {sellers.map((t) => (
          <Chip key={t.id} active={filter === t.id} onClick={() => setFilter(filter === t.id ? null : t.id)}>
            {t.code} {t.name}
            {!t.isOpen && <span className="text-xs font-bold uppercase">Tutup</span>}
          </Chip>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-8 text-center">
          <p className="font-semibold">Tidak ada menu yang cocok dengan &ldquo;{query.trim()}&rdquo;.</p>
          <Button variant="outline" size="lg" onClick={() => setQuery('')}>Hapus pencarian</Button>
        </div>
      ) : (
        groups.map(({ tenant, items }) => {
          const closed = !tenant.isOpen
          const open = !closed || opened.includes(tenant.id)
          const panelId = `menu-tenant-${tenant.id}`
          const title = (
            <>
              <span className="font-bold">{tenant.code}</span>
              <span className="font-semibold">{tenant.name}</span>
              <Pill tone={closed ? 'neutral' : 'brand'}>{closed ? 'Tutup' : 'Buka'}</Pill>
            </>
          )
          return (
            <section key={tenant.id} className="flex flex-col gap-2">
              <h2 className="text-base">
                {closed ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpened((prev) => (prev.includes(tenant.id) ? prev.filter((x) => x !== tenant.id) : [...prev, tenant.id]))}
                    className="flex min-h-14 w-full items-center gap-3 rounded-lg border bg-muted/50 px-4 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {title}
                    <span className="ml-auto flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      {open ? 'Lipat' : `Lihat ${items.length} menu`}
                      <ChevronDown className={cn('size-4', open && 'rotate-180')} aria-hidden />
                    </span>
                  </button>
                ) : (
                  <span className="flex min-h-11 items-center gap-3">{title}</span>
                )}
              </h2>
              <div id={panelId} hidden={!open}>
                {closed && (
                  <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleAlert className="size-4 shrink-0" aria-hidden />
                    Tutup sekarang. Menu belum bisa dipesan.
                  </p>
                )}
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada menu.</p>
                ) : (
                  <ul className="grid gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
                    {items.map((m) => {
                      const qty = cart[m.id] ?? 0
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            disabled={closed || !m.isAvailable || qty >= MAX_QTY}
                            onClick={() => onAdd(m.id)}
                            className={cn(
                              'flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:bg-muted/50 disabled:text-muted-foreground',
                              qty > 0 && 'border-primary bg-accent',
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block leading-tight font-semibold">{m.name}</span>
                              <span className="block text-sm text-muted-foreground">{rupiah(m.price)}</span>
                            </span>
                            {!m.isAvailable ? (
                              <Pill tone="danger">Habis</Pill>
                            ) : qty > 0 ? (
                              <span className="grid min-w-9 shrink-0 place-items-center rounded-full bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
                                {qty}
                                <span className="sr-only"> di keranjang</span>
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-14 items-center gap-2 rounded-lg border px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}
