'use client'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rupiah } from '@/lib/rupiah'
import type { BuyerLine } from './buyer-cart'
import { MenuPhoto } from './menu-photo'
import { QtyControl } from './qty-stepper'

const NOTE_MAX = 100 // sama dengan batas di lib/cart.ts

export function CheckoutLine({ line, onAdd, onDec, onNote }: {
  line: BuyerLine
  onAdd: () => void
  onDec: () => void
  onNote: (note: string) => void
}) {
  const { item, tenant, quantity, note } = line
  const [noteOpen, setNoteOpen] = useState(false)
  const showNote = noteOpen || note !== ''
  const noteId = `note-${item.id}`
  const problem = !item.isAvailable ? 'Habis' : !tenant.isOpen ? 'Tenant tutup' : null

  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <div className="flex gap-3">
        <MenuPhoto size="sm" src={item.imageUrl} muted={!!problem} />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-bold break-words">{item.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {rupiah(item.price)}
            {problem && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs leading-none font-bold text-destructive">{problem}</span>}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold">{rupiah(item.price * quantity)}</p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 pl-15">
        {showNote ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus aria-hidden className="size-4" />
            Tambah catatan
          </button>
        )}
        <QtyControl name={item.name} quantity={quantity} canAdd={!problem} onAdd={onAdd} onDec={onDec} />
      </div>
      {showNote && (
        <div className="mt-2 flex flex-col gap-1.5">
          <Label htmlFor={noteId}>Catatan untuk {item.name}</Label>
          <Input
            id={noteId}
            value={note}
            autoFocus={noteOpen} // dibuka lewat tombol "Tambah catatan" yang baru hilang: fokus pindah ke sini
            maxLength={NOTE_MAX}
            placeholder="Contoh: tidak pakai sambal"
            aria-describedby={`${noteId}-count`}
            onChange={(e) => onNote(e.target.value)}
          />
          <p id={`${noteId}-count`} className="text-right text-xs text-muted-foreground">{note.length}/{NOTE_MAX}</p>
        </div>
      )}
    </li>
  )
}
