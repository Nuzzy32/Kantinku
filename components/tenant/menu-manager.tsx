'use client'
import { useState } from 'react'
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/toast'
import { menuItems, myTenantId } from '@/lib/mock'
import { rupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'
import { MenuFormDialog, type MenuDraft } from './menu-form-dialog'
import { useTenant, type MenuRow } from './tenant-provider'

function MenuRowItem({ item, onToggle, onEdit, onRemove }: {
  item: MenuRow
  onToggle: (item: MenuRow, available: boolean) => void
  onEdit: (item: MenuRow) => void
  onRemove: (item: MenuRow) => void
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-2">
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

export function MenuManager() {
  const { menu, setMenu } = useTenant()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MenuRow | null>(null)

  const live = menu.filter((i) => !i.deleted)
  const categories = [...new Set(live.map((i) => i.category))]
  const q = query.trim().toLowerCase()
  const shown = live.filter((i) => i.name.toLowerCase().includes(q))

  const patch = (id: number, change: Partial<MenuRow>) => setMenu((m) => m.map((i) => (i.id === id ? { ...i, ...change } : i)))

  const openDialog = (item: MenuRow | null) => {
    setEditing(item)
    setDialogOpen(true)
  }

  const toggle = (item: MenuRow, available: boolean) => {
    patch(item.id, { isAvailable: available })
    toast(available ? `${item.name} tersedia lagi.` : `${item.name} ditandai habis.`)
  }

  const remove = (item: MenuRow) => {
    patch(item.id, { deleted: true })
    toast(`${item.name} dihapus. Riwayat pesanan lama tetap utuh.`, { label: 'Urungkan', onClick: () => patch(item.id, { deleted: false }) })
  }

  const save = (draft: MenuDraft) => {
    if (editing) {
      patch(editing.id, draft)
      toast('Menu disimpan.')
    } else {
      const id = Math.max(...menuItems.map((i) => i.id), ...menu.map((i) => i.id)) + 1
      setMenu((m) => [...m, { id, tenantId: myTenantId, isAvailable: true, ...draft }])
      toast(`${draft.name} ditambahkan.`)
    }
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

      <MenuFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} categories={categories} onSave={save} />
    </div>
  )
}
