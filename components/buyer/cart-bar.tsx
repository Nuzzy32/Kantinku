'use client'
import Link from 'next/link'
import { rupiah } from '@/lib/rupiah'
import { useBuyerCart } from './buyer-cart'

// Tombol oranye lebar penuh di bawah. Pembungkus role="status" selalu ada supaya perubahan isi keranjang dibacakan pembaca layar.
// Induknya `pointer-events-none` (zona sticky tembus ketuk), jadi tombolnya menyalakan lagi.
export function CartBar() {
  const { count, total } = useBuyerCart()
  return (
    <div role="status">
      {count > 0 && (
        <div className="pointer-events-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/checkout"
            className="flex h-14 items-center justify-between gap-3 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-lg outline-none transition-colors hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <span>{count} item</span>
            <span>{rupiah(total)} · Lihat pesanan</span>
          </Link>
        </div>
      )}
    </div>
  )
}
