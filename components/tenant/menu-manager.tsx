'use client'
import { startTransition, useOptimistic, useState } from 'react'
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/toast'
import { setActive, setAvailable, type ActionResult } from '@/app/tenant/(app)/menu/actions'
import { rupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'
import { MenuPhoto } from '@/components/buyer/menu-photo'
import { MenuFormDialog } from './menu-form-dialog'

export type TenantMenuItem = { id: number; name: string; price: number; category: string; isAvailable: boolean; imageUrl: string | null }
type Change = { id: number; isAvailable?: boolean; removed?: boolean }

function MenuRowItem({ item, onToggle, onEdit, onRemove }: {
  item: TenantMenuItem
  onToggle: (item: TenantMenuItem, available: boolean) => void
  onEdit: (item: TenantMenuItem) => void
  onRemove: (item: TenantMenuItem) => void
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-2">
      <MenuPhoto size="sm" src={item.imageUrl} muted={!item.isAvailable} />
      <div className="min-w-0 flex-1">
        <div className={cn('text-lg font-semibold', !item.isAvailable && 'text-muted-foreground')}>{item.name}</div>
        <div className="text-base text-ink-2">{rupiah(item.price)}</div>
      </div>
      <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-1">
        <Switch checked={item.isAvailable} onCheckedChange={(v) => onToggle(item, v)} />
        <span className={cn('w-20 text-base font-bold', item.isAvailable ? 'text-primary' : 'text-destructive')}>
          <span className="sr-only">{item.name}: </span>
          {item.isAvailable ? 'Tersedia' : 'Habis'}
        </span>
      </label>
      <Button variant="outline" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}>
        <Pencil aria-hidden />
        Edit
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Hapus ${item.name}`} onClick={() => onRemove(item)}>
        <Trash2 className="size-5" aria-hidden />
      </Button>
    </li>
  )
}

// Data dari server (page.tsx). Saklar & hapus tampil langsung (optimistic); gagal = kembali seperti semula + pesan.
export function MenuManager({ items, categories: allCategories }: { items: TenantMenuItem[]; categories: string[] }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TenantMenuItem | null>(null)
  const [live, apply] = useOptimistic(items, (list, c: Change) =>
    c.removed ? list.filter((i) => i.id !== c.id) : list.map((i) => (i.id === c.id ? { ...i, isAvailable: c.isAvailable! } : i)),
  )

  // Kategori yang punya menu dulu (urutan server), lalu kategori kosong supaya tetap bisa dipilih di dialog.
  const categories = [...new Set([...live.map((i) => i.category), ...allCategories])]
  const q = query.trim().toLowerCase()
  const shown = live.filter((i) => i.name.toLowerCase().includes(q))

  const run = (change: Change, action: () => Promise<ActionResult>, ok: () => void) =>
    startTransition(async () => {
      apply(change)
      try {
        const { error } = await action()
        if (error) toast(error)
        else ok()
      } catch { toast('Gagal menyimpan. Periksa koneksi lalu coba lagi.') }
    })

  const openDialog = (item: TenantMenuItem | null) => {
    setEditing(item)
    setDialogOpen(true)
  }

  const toggle = (item: TenantMenuItem, available: boolean) =>
    run({ id: item.id, isAvailable: available }, () => setAvailable(item.id, available), () =>
      toast(available ? `${item.name} tersedia lagi.` : `${item.name} ditandai habis.`))

  const remove = (item: TenantMenuItem) =>
    run({ id: item.id, removed: true }, () => setActive(item.id, false), () =>
      toast(`${item.name} dihapus. Riwayat pesanan lama tetap utuh.`, {
        label: 'Urungkan',
        onClick: () => startTransition(async () => {
          try {
            const { error } = await setActive(item.id, true)
            if (error) toast(error)
          } catch { toast('Gagal mengembalikan menu. Periksa koneksi lalu coba lagi.') }
        }),
      }))

  const saved = (name: string) => {
    toast(editing ? 'Menu disimpan.' : `${name} ditambahkan.`)
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Menu</h1>
        <p className="text-base text-ink-2">Saklar Habis langsung terlihat di HP pembeli.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor="menu-search">Cari menu</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="menu-search" type="search" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <Button size="lg" onClick={() => openDialog(null)}>
          <Plus aria-hidden />
          Tambah menu
        </Button>
      </div>

      {live.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-12 text-center">
          <UtensilsCrossed className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-semibold">Belum ada menu.</p>
          <p className="text-base text-muted-foreground">Tambahkan menu pertamamu supaya pembeli bisa memesan.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-12 text-center">
          <p className="text-lg font-semibold">Tidak ada menu yang cocok dengan &ldquo;{query.trim()}&rdquo;.</p>
          <Button variant="outline" onClick={() => setQuery('')}>
            Hapus pencarian
          </Button>
        </div>
      ) : (
        categories.map((category, index) => {
          const rows = shown.filter((i) => i.category === category)
          if (rows.length === 0) return null
          return (
            <section key={category} aria-labelledby={`cat-${index}`} className="overflow-hidden rounded-lg border bg-card">
              <h2 id={`cat-${index}`} className="border-b bg-muted/60 px-4 py-2 text-sm font-bold tracking-wide text-ink-2 uppercase">
                {category}
              </h2>
              <ul className="divide-y">
                {rows.map((item) => (
                  <MenuRowItem key={item.id} item={item} onToggle={toggle} onEdit={openDialog} onRemove={remove} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      <MenuFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} categories={categories} onSaved={saved} />
    </div>
  )
}
