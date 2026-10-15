'use client'
import { ArrowLeft, Search, SearchX } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MenuItem, TenantSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isTenantOpen, useBuyerCart } from './buyer-cart'
import { MenuRow } from './menu-row'

// Pencarian layar penuh. Isi (SearchBody) ikut hilang saat ditutup, jadi isian cari otomatis kosong lagi.
// Dialog di-portal ke <body>, jadi `theme-buyer` dipasang di Popup-nya sendiri.
type Catalog = { tenants: TenantSummary[]; items: MenuItem[]; canteenClosed: boolean }

export function SearchSheet({ open, onOpenChange, ...catalog }: Catalog & {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={inputRef}
        className="theme-buyer top-0 h-dvh max-w-[430px] translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 rounded-none bg-card p-0 text-sm text-foreground ring-0 sm:max-w-[430px]"
      >
        <SearchBody inputRef={inputRef} {...catalog} />
      </DialogContent>
    </Dialog>
  )
}

function SearchBody({ inputRef, tenants, items, canteenClosed }: Catalog & { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [query, setQuery] = useState('')
  const { qty, add, dec } = useBuyerCart()
  const q = query.trim().toLowerCase()
  const results = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : []

  return (
    <>
      <div className="px-2 pt-1 pb-3 shadow-sm">
        <div className="flex items-center gap-1">
          <DialogClose render={<Button variant="ghost" size="icon" aria-label="Tutup pencarian" />}>
            <ArrowLeft aria-hidden className="size-5" />
          </DialogClose>
          <DialogTitle className="text-base font-bold">Cari menu</DialogTitle>
        </div>
        <div className="px-2">
          <Label htmlFor="menu-search" className="mb-1.5 text-xs font-normal text-muted-foreground">Nama menu, dari semua tenant</Label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contoh: mie, jus, ayam"
              autoComplete="off"
              enterKeyHint="search"
              className="pl-10"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        <p role="status" className={cn('px-4 pt-3 text-sm text-muted-foreground', (!q || results.length === 0) && 'sr-only')}>
          {q ? (results.length ? `${results.length} menu ditemukan` : 'Tidak ada yang cocok') : ''}
        </p>
        {!q && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <Search aria-hidden className="size-8" />
            <p>Ketik nama menu untuk mencari di semua tenant.</p>
          </div>
        )}
        {q && results.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
            <SearchX aria-hidden className="size-8" />
            <p className="font-bold text-foreground">Tidak ada yang cocok</p>
            <p>Coba kata lain, misalnya &quot;mie&quot; atau &quot;jus&quot;.</p>
          </div>
        )}
        <ul>
          {results.map((item) => {
            const tenant = tenants.find((t) => t.id === item.tenantId)
            return tenant && (
              <MenuRow
                key={item.id}
                item={item}
                tenant={tenant}
                open={isTenantOpen(tenant, canteenClosed)}
                inSearch
                quantity={qty(item.id)}
                onAdd={() => add(item.id)}
                onDec={() => dec(item.id)}
              />
            )
          })}
        </ul>
      </div>
    </>
  )
}
