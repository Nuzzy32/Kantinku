'use client'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const MAX = 50 // sama dengan batas di lib/cart.ts

// Tampak kecil seperti ESB (28px). Area sentuh 44px lewat `after:-inset-2` (lapisan tak terlihat).
const hit = 'relative outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40'

// Tombol "Tambah" saat jumlah 0, stepper "− n +" saat ada. Keduanya bergaris oranye.
export function QtyControl({ name, quantity, canAdd = true, onAdd, onDec }: {
  name: string
  quantity: number
  canAdd?: boolean
  onAdd: () => void
  onDec: () => void
}) {
  const addRef = useRef<HTMLButtonElement>(null)
  const incRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)
  const has = quantity > 0

  // Tombol yang baru ditekan hilang saat Tambah <-> stepper bertukar. Pindahkan fokus agar pengguna keyboard tidak kehilangan posisi.
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    ;(has ? incRef : addRef).current?.focus()
  }, [has])

  if (!has) {
    return (
      <button
        ref={addRef}
        type="button"
        disabled={!canAdd}
        aria-label={`Tambah ${name}`}
        onClick={() => { refocus.current = true; onAdd() }}
        className={cn(hit, 'h-7 w-16 rounded-lg border border-brand-line bg-card text-sm font-bold text-primary transition-colors hover:bg-accent hover:text-accent-foreground')}
      >
        Tambah
      </button>
    )
  }
  return (
    <div role="group" aria-label={`Jumlah ${name}`} className="inline-flex h-7 items-center rounded-lg border border-brand-line bg-card text-primary">
      <button
        type="button"
        aria-label={quantity === 1 ? `Hapus ${name} dari pesanan` : `Kurangi ${name}`}
        onClick={() => { if (quantity === 1) refocus.current = true; onDec() }}
        className={cn(hit, 'grid size-7 place-items-center rounded-lg')}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold text-foreground">{quantity}</span>
      <button
        ref={incRef}
        type="button"
        aria-label={`Tambah satu ${name}`}
        disabled={!canAdd || quantity >= MAX}
        onClick={onAdd}
        className={cn(hit, 'grid size-7 place-items-center rounded-lg')}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  )
}
