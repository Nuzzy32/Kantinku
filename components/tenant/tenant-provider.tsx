'use client'
import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { menuItems, myTenantId, tenantOrders, tenants } from '@/lib/mock'
import type { MenuItem, OrderStatus, Tenant, TenantOrder } from '@/lib/types'
import { useAlarm, useWakeLock } from './use-alarm'

// Transisi sah = public.set_order_status di docs/schema.sql.
const ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['completed'],
}

// Langkah maju (bukan batal) dari status ini, atau undefined bila sudah akhir.
export const forwardStatus = (status: OrderStatus) => ALLOWED[status]?.find((s) => s !== 'cancelled')
export const canReject = (status: OrderStatus) => !!ALLOWED[status]?.includes('cancelled')

// Hapus menu = soft delete: baris tetap ada (riwayat pesanan lama utuh), hanya disembunyikan.
export type MenuRow = MenuItem & { deleted?: boolean }

type TenantStore = {
  tenant: Tenant
  orders: TenantOrder[]
  newCount: number
  elapsedMin: number
  /** Pindah status bila sah. `cancelled` wajib `reason`. Mengembalikan true bila berhasil. */
  moveOrder: (number: string, to: OrderStatus, reason?: string) => boolean
  /** Urungkan: kembalikan ke `from` hanya bila pesanan masih berstatus `to`. */
  undoOrder: (number: string, from: OrderStatus, to: OrderStatus) => void
  menu: MenuRow[]
  setMenu: Dispatch<SetStateAction<MenuRow[]>>
  shopOpen: boolean
  setShopOpen: Dispatch<SetStateAction<boolean>>
  started: boolean
  start: () => void
  muted: boolean
  setMuted: Dispatch<SetStateAction<boolean>>
}

const Ctx = createContext<TenantStore | null>(null)

export function useTenant() {
  const store = useContext(Ctx)
  if (!store) throw new Error('useTenant harus dipakai di dalam TenantProvider')
  return store
}

const tenant = tenants.find((t) => t.id === myTenantId) ?? tenants[0]

// Satu sumber data untuk Antrean, Menu, Rekap, dan bunyi. Berada di layout supaya bunyi tetap jalan saat tenant membuka tab Menu/Rekap.
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<TenantOrder[]>(tenantOrders)
  const [menu, setMenu] = useState<MenuRow[]>(() => menuItems.filter((i) => i.tenantId === myTenantId))
  const [shopOpen, setShopOpen] = useState(tenant.isOpen)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [elapsedMin, setElapsedMin] = useState(0)

  // Menit sejak halaman dibuka. Render pertama 0 (tanpa Date.now()) supaya server dan browser sama.
  useEffect(() => {
    const t0 = Date.now()
    const id = setInterval(() => setElapsedMin(Math.floor((Date.now() - t0) / 60_000)), 10_000)
    return () => clearInterval(id)
  }, [])

  const newCount = orders.filter((o) => o.status === 'paid').length
  const enableAlarm = useAlarm(started && !muted && newCount > 0)
  useWakeLock(started)

  const moveOrder: TenantStore['moveOrder'] = (number, to, reason) => {
    const current = orders.find((o) => o.number === number)
    if (!current || !ALLOWED[current.status]?.includes(to)) return false
    if (to === 'cancelled' && !reason?.trim()) return false
    setOrders((list) => list.map((o) => (o.number === number ? { ...o, status: to, ...(to === 'cancelled' && { cancelReason: reason!.trim() }) } : o)))
    return true
  }

  // ponytail: Urungkan hanya di sisi layar (ready -> accepted bukan transisi sah di DB). Saat Supabase tersambung, tunda panggilan set_order_status 6 detik.
  const undoOrder: TenantStore['undoOrder'] = (number, from, to) =>
    setOrders((list) => list.map((o) => (o.number === number && o.status === to ? { ...o, status: from } : o)))

  const start = () => {
    enableAlarm()
    setStarted(true)
  }

  return (
    <Ctx.Provider value={{ tenant, orders, newCount, elapsedMin, moveOrder, undoOrder, menu, setMenu, shopOpen, setShopOpen, started, start, muted, setMuted }}>
      {children}
    </Ctx.Provider>
  )
}
