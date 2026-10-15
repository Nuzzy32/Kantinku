import { rupiah } from '@/lib/rupiah'
import type { MenuItem, Tenant } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MenuPhoto } from './menu-photo'
import { QtyControl } from './qty-stepper'

// Foto kiri; nama bold, harga bold, tombol Tambah di kanan bawah. `open` = tenant dan kantin sedang buka.
// `inSearch` menambah nama tenant di atas nama menu (hasil lintas tenant).
export function MenuRow({ item, tenant, open, quantity, inSearch = false, onAdd, onDec }: {
  item: MenuItem
  tenant: Tenant
  open: boolean
  quantity: number
  inSearch?: boolean
  onAdd: () => void
  onDec: () => void
}) {
  const soldOut = !item.isAvailable
  const canAdd = !soldOut && open
  // Yang sudah ada di keranjang tetap bisa dikurangi walau habis/tutup.
  const showControl = quantity > 0 || canAdd
  const label = soldOut ? 'Habis' : inSearch && !open ? 'Tutup' : null
  const dim = soldOut && 'text-muted-foreground'

  return (
    <li className="mx-4 flex gap-3 border-b border-border py-3 last:border-b-0">
      <MenuPhoto muted={soldOut || !open} />
      <div className="flex min-h-18 min-w-0 flex-1 flex-col">
        {inSearch && <p className="text-xs text-muted-foreground">{tenant.code} · {tenant.name}</p>}
        <p className={cn('text-sm leading-snug font-bold break-words', dim)}>{item.name}</p>
        <p className={cn('mt-0.5 text-sm font-bold', dim)}>{rupiah(item.price)}</p>
        <div className="mt-auto flex min-h-7 items-end justify-end pt-1">
          {showControl ? (
            <QtyControl name={item.name} quantity={quantity} canAdd={canAdd} onAdd={onAdd} onDec={onDec} />
          ) : (
            label && <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
          )}
        </div>
      </div>
    </li>
  )
}
