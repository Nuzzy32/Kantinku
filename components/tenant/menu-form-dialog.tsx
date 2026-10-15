'use client'
import { useState, useTransition } from 'react'
import { Check, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveMenuItem } from '@/app/tenant/(app)/menu/actions'
import { rupiah } from '@/lib/rupiah'
import type { TenantMenuItem } from './menu-manager'

const NEW_CATEGORY = '__new__'
const MAX_PHOTO = 300 * 1024

// Foto HP bisa beberapa MB: perkecil (sisi terpanjang 800px) lalu turunkan kualitas WebP sampai ≤ 300KB. Server memeriksa ulang.
async function compressPhoto(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null
  for (const [side, quality] of [[800, 0.82], [800, 0.65], [640, 0.6], [480, 0.55]] as const) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', quality))
    if (blob && blob.size <= MAX_PHOTO) return blob
  }
  return null
}

// Berada di dalam DialogContent: terpasang ulang tiap dialog dibuka, jadi isian selalu mulai dari `item` (atau kosong).
function MenuForm({ item, categories, onSaved, onClose }: { item: TenantMenuItem | null; categories: string[]; onSaved: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [category, setCategory] = useState(item?.category ?? categories[0] ?? NEW_CATEGORY)
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(item?.imageUrl ?? null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [pending, startSaving] = useTransition()

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // pilih file yang sama lagi tetap memicu onChange
    if (!file) return
    setPhotoBusy(true)
    const blob = await compressPhoto(file)
    setPhotoBusy(false)
    if (!blob) return setError('Foto tidak bisa dibaca atau terlalu besar. Coba foto lain.')
    setError('')
    setPhoto(blob)
    setPreview(URL.createObjectURL(blob))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pending || photoBusy) return
    const priceNum = Number(price)
    if (!name.trim() || !(priceNum > 0)) return setError('Isi nama dan harga lebih dari 0.')
    const typed = newCategory.trim()
    // Nama kategori baru yang sama dengan yang sudah ada (beda huruf besar/kecil) dipakai ulang, bukan digandakan.
    const finalCategory = category === NEW_CATEGORY ? (categories.find((c) => c.toLowerCase() === typed.toLowerCase()) ?? typed) : category
    if (!finalCategory) return setError('Isi nama kategori baru.')
    const form = new FormData()
    if (item) form.set('id', String(item.id))
    form.set('name', name.trim())
    form.set('price', String(priceNum))
    form.set('category', finalCategory)
    if (photo) form.set('photo', new File([photo], 'foto.webp', { type: 'image/webp' }))
    else if (!preview && item?.imageUrl) form.set('removePhoto', '1')
    startSaving(async () => {
      const result = await saveMenuItem(form)
      if (result.error) setError(result.error)
      else onSaved(name.trim())
    })
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

      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong px-3 py-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal, bukan aset yang perlu dioptimasi
          <img src={preview} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <ImageIcon className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <label className="flex-1 cursor-pointer text-base font-semibold text-primary has-focus-visible:underline">
          {photoBusy ? 'Mengecilkan foto…' : preview ? 'Ganti foto' : 'Pilih foto (opsional)'}
          <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} disabled={photoBusy || pending} />
          <span className="block text-sm font-normal text-muted-foreground">Otomatis dikecilkan ≤ 300KB</span>
        </label>
        {preview && (
          <Button type="button" variant="ghost" size="icon" aria-label="Hapus foto" onClick={() => { setPhoto(null); setPreview(null) }}>
            <X className="size-5" aria-hidden />
          </Button>
        )}
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
        <Button type="submit" size="lg" disabled={pending || photoBusy}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function MenuFormDialog({ open, onOpenChange, item, categories, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TenantMenuItem | null
  categories: string[]
  onSaved: (name: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <MenuForm item={item} categories={categories} onSaved={onSaved} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
