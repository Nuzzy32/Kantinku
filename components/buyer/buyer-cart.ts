import { useMemo, useSyncExternalStore } from 'react'
import { cartKey, useCart } from '@/lib/cart'
import { demoTable, menuItems, tenants } from '@/lib/mock'
import type { MenuItem, TenantSummary } from '@/lib/types'

// Satu kantin + satu meja di data contoh. Story 1-2 mengganti ini dengan slug kantin dan label meja dari token QR.
export const buyerCartKey = cartKey('teknik', demoTable)

export type BuyerLine = { item: MenuItem; tenant: TenantSummary; quantity: number; note: string }

// Kantin tutup (?tutup=1) menutup semua tenant, apa pun saklar tenantnya.
export const isTenantOpen = (tenant: TenantSummary, canteenClosed: boolean) => tenant.isOpen && !canteenClosed

// Keranjang + data menu/tenant-nya. Id yang tidak ada di data (sisa localStorage lama) dibuang.
export function useBuyerCart() {
  const { cart, add, dec, setNote, clear } = useCart(buyerCartKey)
  const lines = useMemo<BuyerLine[]>(
    () =>
      menuItems.flatMap((item) => {
        const line = cart[item.id]
        const tenant = tenants.find((t) => t.id === item.tenantId)
        return line && tenant ? [{ item, tenant, quantity: line.quantity, note: line.note }] : []
      }),
    [cart],
  )
  const count = lines.reduce((a, l) => a + l.quantity, 0)
  const total = lines.reduce((a, l) => a + l.item.price * l.quantity, 0)
  return { lines, count, total, qty: (id: number) => cart[id]?.quantity ?? 0, add, dec, setNote, clear }
}

export const groupByTenant = (lines: BuyerLine[]) =>
  tenants
    .map((tenant) => ({ tenant, lines: lines.filter((l) => l.tenant.id === tenant.id) }))
    .filter((g) => g.lines.length > 0)

// false di server dan render hydration pertama, true sesudahnya. Keranjang baru terbaca dari localStorage setelah itu,
// jadi layar yang bergantung pada isi keranjang menunggu ini supaya tidak berkedip "keranjang kosong".
const noop = () => () => {}
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false)
