'use client'
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { cartKey, useCart } from '@/lib/cart'
import type { TableMenu } from '@/lib/menu'
import type { MenuItem, TenantSummary } from '@/lib/types'
import { menuHref as demoMenuHref } from './canteen'

// Menu meja yang sedang dibuka (diambil server dari token QR). Halaman pembeli membungkus isinya dengan provider ini.
const MenuCtx = createContext<TableMenu | null>(null)
export function BuyerMenuProvider({ menu, children }: { menu: TableMenu | null; children: React.ReactNode }) {
  return <MenuCtx value={menu}>{children}</MenuCtx>
}
export const useTableMenu = () => useContext(MenuCtx)
// Kembali ke menu meja ini. Tanpa meja (halaman dibuka langsung) jatuh ke meja demo.
export const useMenuHref = () => {
  const menu = useTableMenu()
  return menu ? `/t/${menu.qrToken}` : demoMenuHref
}

export type BuyerLine = { item: MenuItem; tenant: TenantSummary; quantity: number; note: string }

// Kantin tutup (?tutup=1) menutup semua tenant, apa pun saklar tenantnya.
export const isTenantOpen = (tenant: TenantSummary, canteenClosed: boolean) => tenant.isOpen && !canteenClosed

// Keranjang (localStorage per kantin + meja) + data menu/tenant-nya dari server. Harga & status habis/tutup selalu yang terbaru.
// Id yang tidak ada di menu (dihapus tenant, sisa lama) tidak ditampilkan.
export function useBuyerCart() {
  const menu = useTableMenu()
  const { cart, add, dec, setNote, clear } = useCart(menu ? cartKey(menu.canteen.slug, menu.qrToken) : null)
  const lines = useMemo<BuyerLine[]>(
    () =>
      (menu?.items ?? []).flatMap((item) => {
        const line = cart[item.id]
        const tenant = menu?.tenants.find((t) => t.id === item.tenantId)
        return line && tenant ? [{ item, tenant, quantity: line.quantity, note: line.note }] : []
      }),
    [cart, menu],
  )
  const count = lines.reduce((a, l) => a + l.quantity, 0)
  const total = lines.reduce((a, l) => a + l.item.price * l.quantity, 0)
  return { lines, count, total, qty: (id: number) => cart[id]?.quantity ?? 0, add, dec, setNote, clear }
}

// Urutan tenant mengikuti kemunculan pertamanya di keranjang (menu sudah diurutkan per tenant oleh server).
export const groupByTenant = (lines: BuyerLine[]) => {
  const groups: { tenant: TenantSummary; lines: BuyerLine[] }[] = []
  for (const l of lines) {
    const g = groups.find((x) => x.tenant.id === l.tenant.id)
    if (g) g.lines.push(l)
    else groups.push({ tenant: l.tenant, lines: [l] })
  }
  return groups
}

// false di server dan render hydration pertama, true sesudahnya. Keranjang baru terbaca dari localStorage setelah itu,
// jadi layar yang bergantung pada isi keranjang menunggu ini supaya tidak berkedip "keranjang kosong".
const noop = () => () => {}
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false)
