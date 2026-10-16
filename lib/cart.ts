'use client'
import { useCallback, useSyncExternalStore } from 'react'

// Keranjang di localStorage, per kantin + meja (Story 2). Harga TIDAK disimpan: server menghitung ulang dari DB.
export type CartLine = { quantity: number; note: string }
export type Cart = Record<number, CartLine> // menu_item_id -> baris

const EMPTY: Cart = {}
const cache = new Map<string, { raw: string | null; cart: Cart; unsaved?: boolean }>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function read(key: string): Cart {
  const hit = cache.get(key)
  // shortcut: saat storage gagal, keranjang hanya bertahan di tab ini sampai halaman dimuat ulang.
  if (hit?.unsaved) return hit.cart
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { return hit?.cart ?? EMPTY }
  if (hit && hit.raw === raw) return hit.cart // referensi stabil untuk useSyncExternalStore
  let cart = EMPTY
  try { if (raw) cart = sanitize(JSON.parse(raw)) } catch {}
  cache.set(key, { raw, cart })
  return cart
}

// localStorage bisa diubah pengguna atau sisa versi lama: buang baris yang bentuknya tidak sah.
function sanitize(data: unknown): Cart {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return EMPTY
  const cart: Cart = {}
  for (const [id, line] of Object.entries(data)) {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) continue
    const q = (line as Partial<CartLine> | null)?.quantity
    if (!Number.isInteger(q) || q! < 1 || q! > 50) continue
    const note = (line as CartLine).note
    cart[Number(id)] = { quantity: q!, note: typeof note === 'string' ? note.slice(0, 100) : '' }
  }
  return cart
}

function write(key: string, cart: Cart) {
  const raw = Object.keys(cart).length ? JSON.stringify(cart) : null
  try {
    if (raw) localStorage.setItem(key, raw)
    else localStorage.removeItem(key)
    cache.set(key, { raw, cart })
  } catch {
    cache.set(key, { raw, cart, unsaved: true })
  }
  notify()
}

export const cartKey = (canteenSlug: string, table: string) => `kantinku-cart:${canteenSlug}:${table}`

const settled = new Set<string>()
export function settlePaidCart(key: string, ordered: Cart, token: string) {
  const marker = `kantinku-paid:${token}`
  if (settled.has(token)) return
  try { if (localStorage.getItem(marker)) return } catch {}
  const current = read(key)
  // Jangan hapus keranjang baru yang diubah pembeli saat pesanan lama sedang dibayar.
  const same = Object.keys(current).length === Object.keys(ordered).length
    && Object.entries(ordered).every(([id, line]) => current[Number(id)]?.quantity === line.quantity && current[Number(id)]?.note === line.note)
  if (same) write(key, EMPTY)
  settled.add(token)
  try { localStorage.setItem(marker, '1') } catch {}
}

export function restoreCart(key: string, ordered: Cart) {
  const current = read(key)
  // Keranjang asli mungkin masih ada; jangan gandakan jumlah atau menimpa catatan yang baru.
  const next = { ...sanitize(ordered), ...current }
  write(key, next)
}

// key null = belum tahu meja mana (mis. halaman dibuka tanpa token): keranjang kosong, tidak menulis apa pun.
export function useCart(key: string | null) {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb)
    window.addEventListener('storage', cb)
    return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
  }, [])
  const cart = useSyncExternalStore(subscribe, () => (key ? read(key) : EMPTY), () => EMPTY)

  const change = (id: number, delta: number) => {
    if (!key) return
    const cur = read(key)
    const quantity = Math.max(0, Math.min(50, (cur[id]?.quantity ?? 0) + delta))
    const next = { ...cur }
    if (quantity) next[id] = { quantity, note: cur[id]?.note ?? '' }
    else delete next[id]
    write(key, next)
  }
  const setNote = (id: number, note: string) => {
    if (!key) return
    const cur = read(key)
    if (cur[id]) write(key, { ...cur, [id]: { ...cur[id], note: note.slice(0, 100) } })
  }
  const clear = () => { if (key) write(key, EMPTY) }
  return { cart, add: (id: number) => change(id, 1), dec: (id: number) => change(id, -1), setNote, clear }
}
