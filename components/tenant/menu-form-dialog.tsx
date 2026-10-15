'use client'
import { useState } from 'react'
import { Check, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pill } from '@/components/pill'
import { rupiah } from '@/lib/rupiah'
import type { MenuRow } from './tenant-provider'

export type MenuDraft = { name: string; price: number; category: string }

const NEW_CATEGORY = '__new__'

// Berada di dalam DialogContent: terpasang ulang tiap dialog dibuka, jadi isian selalu mulai dari `item` (atau kosong).
function MenuForm({ item, categories, onSave, onClose }: { item: MenuRow | null; categories: string[]; onSave: (draft: MenuDraft) => void; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [category, setCategory] = useState(item?.category ?? categories[0] ?? NEW_CATEGORY)
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = Number(price)
    if (!name.trim() || !(priceNum > 0)) return setError('Isi nama dan harga lebih dari 0.')
    const typed = newCategory.trim()
    // Nama kategori baru yang sama dengan yang sudah ada (beda huruf besar/kecil) dipakai ulang, bukan digandakan.
    const finalCategory = category === NEW_CATEGORY ? (categories.find((c) => c.toLowerCase() === typed.toLowerCase()) ?? typed) : category
    if (!finalCategory) return setError('Isi nama kategori baru.')
    onSave({ name: name.trim(), price: priceNum, category: finalCategory })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle className="text-xl leading-snug">{item ? 'Edit menu' : 'Tambah menu'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="menu-name">Nama menu</Label>
        <Input id="menu-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="menu-price">Harga (rupiah, angka saja)</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-ink-2" aria-hidden>
            Rp
          </span>
          <Input id="menu-price" className="pl-10" inputMode="numeric" autoComplete="off" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 7))} />
        </div>
        <p className="text-sm text-muted-foreground">{Number(price) > 0 ? `Pembeli melihat ${rupiah(Number(price))}` : 'Contoh: 13000'}</p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Kategori</legend>
        <div className="flex flex-wrap gap-2">
          {[...categories, NEW_CATEGORY].map((c) => (
            <label
              key={c}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-base font-semibold has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="menu-category" className="sr-only" checked={category === c} onChange={() => setCategory(c)} />
              {category === c && <Check className="size-4" aria-hidden />}
              {c === NEW_CATEGORY ? 'Kategori baru' : c}
            </label>
          ))}
        </div>
        {category === NEW_CATEGORY && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="menu-new-category">Nama kategori baru</Label>
            <Input id="menu-new-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={30} autoComplete="off" />
          </div>
        )}
      </fieldset>

      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3 text-muted-foreground">
        <ImageIcon className="size-6 shrink-0" aria-hidden />
        <span className="flex-1 text-base">Foto · maks 300KB</span>
        <Pill>Belum aktif</Pill>
      </div>

      {error && (
        <p role="alert" className="text-base font-semibold text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" size="lg">
          Simpan
        </Button>
      </DialogFooter>
    </form>
  )
}

export function MenuFormDialog({ open, onOpenChange, item, categories, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MenuRow | null
  categories: string[]
  onSave: (draft: MenuDraft) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <MenuForm item={item} categories={categories} onSave={onSave} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
