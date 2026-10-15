'use client'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { CircleCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import type { Tenant } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isTenantOpen } from './buyer-cart'

// Bottom sheet "Pilih Tenant". Dialog di-portal ke <body>, jadi `theme-buyer` dipasang di Popup-nya sendiri.
// Popup dirakit dari primitif (bukan DialogContent) supaya scrim bisa dibuat lebih pekat dan sheet menempel di bawah.
// `onClosed` jalan sesudah animasi tutup selesai (kunci gulir halaman sudah lepas), dipakai untuk menggulung ke daftar menu.
export function TenantSheet({ open, onOpenChange, onClosed, tenants, activeId, canteenClosed, onPick }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
  tenants: Tenant[]
  activeId: number
  canteenClosed: boolean
  onPick: (id: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={(o) => { if (!o) onClosed() }}>
      <DialogPortal>
        <DialogOverlay className="bg-foreground/50" />
        <DialogPrimitive.Popup className="theme-buyer fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-card text-sm text-foreground shadow-2xl outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-8">
          <div className="flex items-center justify-between gap-2 py-1 pr-2 pl-4">
            <DialogTitle className="text-base font-bold">Pilih Tenant</DialogTitle>
            <DialogClose render={<Button variant="ghost" size="icon" aria-label="Tutup pilihan tenant" />}>
              <X aria-hidden className="size-5" />
            </DialogClose>
          </div>
          <ul className="flex flex-col gap-2 px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {tenants.map((t) => {
              const selected = t.id === activeId
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onPick(t.id)}
                    className={cn(
                      'flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-2 text-left font-bold uppercase outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-brand-line bg-card text-primary hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      {t.code} {t.name}
                      {!isTenantOpen(t, canteenClosed) && (
                        <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] leading-none font-bold text-foreground normal-case">Tutup</span>
                      )}
                    </span>
                    {selected && <CircleCheck aria-hidden className="size-5 shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
