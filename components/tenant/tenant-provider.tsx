'use client'
import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { updateOrderStatus } from '@/app/tenant/(app)/order-actions'
import { createClient } from '@/lib/supabase/client'
import { readTenantOrders, type LiveTenantOrder } from '@/lib/tenant-order-data'
import type { OrderStatus, Tenant } from '@/lib/types'
import { useToast } from '@/components/toast'
import { useAlarm, useWakeLock } from './use-alarm'

const ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ['accepted', 'cancelled'], accepted: ['ready', 'cancelled'], ready: ['completed'],
}
export const forwardStatus = (status: OrderStatus) => ALLOWED[status]?.find((s) => s !== 'cancelled')
export const canReject = (status: OrderStatus) => !!ALLOWED[status]?.includes('cancelled')
export type CurrentTenant = Pick<Tenant, 'id' | 'code' | 'name' | 'isOpen' | 'sharePercent'>

type TenantStore = {
  tenant: CurrentTenant
  orders: LiveTenantOrder[]
  newCount: number
  elapsedMin: number
  offline: boolean
  pending: number[]
  moveOrder: (id: number, to: OrderStatus, reason?: string) => Promise<boolean>
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

export function TenantProvider({ tenant, initialOrders, children }: { tenant: CurrentTenant; initialOrders: LiveTenantOrder[]; children: React.ReactNode }) {
  const [orders, setOrders] = useState(initialOrders)
  const [shopOpen, setShopOpen] = useState(tenant.isOpen)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [elapsedMin, setElapsedMin] = useState(0)
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState<number[]>([])
  const mutationVersion = useRef(0)
  const pendingIds = useRef(new Set<number>())
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const toast = useToast()

  useEffect(() => {
    const db = createClient()
    let disposed = false
    let fetching = false
    let rerun = false
    let connected = false
    let readFailed = false
    let clockStart = Date.now()
    const refresh = async () => {
      if (fetching) { rerun = true; return }
      fetching = true
      const version = mutationVersion.current
      try {
        const result = await readTenantOrders(db, tenant.id)
        if (!disposed) {
          // Refetch tidak boleh menimpa status optimistis selama mutasi berlangsung.
          if (pendingIds.current.size === 0 && version === mutationVersion.current) {
            setOrders(result.orders)
            clockStart = Date.now()
            setElapsedMin(0)
          }
          readFailed = false
          setOffline(!connected || !navigator.onLine)
        }
      } catch {
        readFailed = true
        if (!disposed) setOffline(true)
      } finally {
        fetching = false
        if (rerun && !disposed) { rerun = false; void refresh() }
      }
    }
    refreshRef.current = refresh
    // Topik unik per mount: realtime-js memakai ulang channel bernama sama yang belum selesai dilepas (remount/Fast Refresh).
    const channel = db.channel(`tenant-orders-${tenant.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, () => { void refresh() })
      .subscribe((status) => {
        connected = status === 'SUBSCRIBED'
        if (!disposed) setOffline(!connected || readFailed || !navigator.onLine)
        if (connected) void refresh()
      })
    const timer = setInterval(() => {
      // Tetap cek saat terlihat: sambungan socket sehat belum menjamin setiap event diterima.
      if (!connected || readFailed || document.visibilityState === 'visible') void refresh()
      setElapsedMin(Math.floor((Date.now() - clockStart) / 60_000))
    }, 10_000)
    const onOnline = () => { void refresh() }
    const onOffline = () => setOffline(true)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    // Tanpa refresh saat mount: data awal dari server (layout), dan SUBSCRIBED memicu refresh. Refresh lebih awal dari
    // SUBSCRIBED sempat memunculkan banner "Koneksi terputus" sesaat di setiap pemuatan halaman.
    return () => {
      disposed = true
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      void db.removeChannel(channel)
    }
  }, [tenant.id])

  const newCount = orders.filter((o) => o.status === 'paid').length
  const enableAlarm = useAlarm(started && !muted && newCount > 0)
  useWakeLock(started)

  const moveOrder: TenantStore['moveOrder'] = async (id, to, reason) => {
    const current = orders.find((o) => o.id === id)
    if (pendingIds.current.has(id)) return false // ketuk ganda saat masih menyimpan: abaikan diam-diam
    if (!current || !ALLOWED[current.status]?.includes(to)) {
      toast('Status pesanan sudah berubah. Antrean diperbarui.')
      void refreshRef.current?.()
      return false
    }
    if (to === 'cancelled' && !reason?.trim()) return false
    mutationVersion.current += 1
    pendingIds.current.add(id)
    setPending([...pendingIds.current])
    setOrders((list) => list.map((o) => o.id === id ? { ...o, status: to, ...(to === 'cancelled' && { cancelReason: reason!.trim() }) } : o))
    let error: string | undefined
    try { error = (await updateOrderStatus({ id, status: to, ...(reason && { reason }) })).error }
    catch { error = 'Gagal mengubah pesanan. Periksa koneksi dan coba lagi.' }
    if (error) {
      setOrders((list) => list.map((o) => o.id === id ? current : o))
      toast(error)
    }
    mutationVersion.current += 1
    pendingIds.current.delete(id)
    setPending([...pendingIds.current])
    void refreshRef.current()
    return !error
  }
  const start = () => { enableAlarm(); setStarted(true) }
  return (
    <Ctx.Provider value={{ tenant, orders, newCount, elapsedMin, offline, pending, moveOrder, shopOpen, setShopOpen, started, start, muted, setMuted }}>
      {children}
    </Ctx.Provider>
  )
}
