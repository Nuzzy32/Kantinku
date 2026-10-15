// Data contoh untuk membangun UI sebelum Supabase tersambung (Story 0-2). Hapus per layar saat story datanya dikerjakan.
import type { DiningTable, MenuItem, Refund, Tenant, TenantOrder } from './types'

export const canteenName = 'Kantin Teknik'
export const demoTable = 'Meja 34'

export const tenants: Tenant[] = [
  { id: 3, code: 'T3', name: 'Dapur Bu Sri', kind: 'Nasi & lauk', isOpen: true, isActive: true, sharePercent: 10, email: 't3@kantinteknik.id' },
  { id: 7, code: 'T7', name: 'Mie Mas Joko', kind: 'Mie & bakso', isOpen: true, isActive: true, sharePercent: 10, email: 't7@kantinteknik.id' },
  { id: 9, code: 'T9', name: 'Segar Jaya', kind: 'Es & jus', isOpen: true, isActive: true, sharePercent: 12, email: 't9@kantinteknik.id' },
  { id: 5, code: 'T5', name: 'Geprek Mantul', kind: 'Ayam', isOpen: false, isActive: true, sharePercent: 10, email: 't5@kantinteknik.id' },
]

export const myTenantId = 7 // tenant yang sedang "login" di prototype

const m = (id: number, tenantId: number, category: string, name: string, price: number, isAvailable = true): MenuItem =>
  ({ id, tenantId, category, name, price, isAvailable, imageUrl: null })

export const menuItems: MenuItem[] = [
  m(1, 3, 'Nasi', 'Nasi Rames', 15000), m(2, 3, 'Nasi', 'Nasi Telur Balado', 12000),
  m(3, 3, 'Lauk', 'Tempe Mendoan (3)', 6000), m(4, 3, 'Lauk', 'Ayam Bakar', 14000, false),
  m(5, 7, 'Mie', 'Mie Ayam', 13000), m(6, 7, 'Mie', 'Mie Ayam Bakso', 17000),
  m(7, 7, 'Bakso', 'Bakso Urat', 16000), m(8, 7, 'Minuman', 'Es Teh Manis', 4000),
  m(9, 9, 'Jus', 'Jus Alpukat', 12000), m(10, 9, 'Jus', 'Jus Jeruk', 10000), m(11, 9, 'Es', 'Es Campur', 11000, false),
  m(12, 5, 'Ayam', 'Ayam Geprek', 15000), m(13, 5, 'Ayam', 'Ayam Geprek Keju', 19000),
]

const o = (
  number: string, customerName: string, tableLabel: string | null, serviceType: TenantOrder['serviceType'],
  items: TenantOrder['items'], status: TenantOrder['status'], ageMin: number, subtotal: number,
  extra: Partial<TenantOrder> = {},
): TenantOrder => ({
  number, customerName, tableLabel, serviceType, paymentMethod: tableLabel ? 'qris' : 'cash', items, status, ageMin, subtotal, ...extra,
})

// Pesanan tenant T7 hari ini.
export const tenantOrders: TenantOrder[] = [
  o('T7-030', 'Bima', 'Meja 3', 'dine_in', [{ quantity: 1, name: 'Mie Ayam' }], 'completed', 185, 13000),
  o('T7-031', 'Sari', 'Meja 12', 'dine_in', [{ quantity: 2, name: 'Bakso Urat' }], 'completed', 160, 32000),
  o('T7-032', 'Hendra', null, 'dine_in', [{ quantity: 1, name: 'Mie Ayam Bakso' }, { quantity: 1, name: 'Es Teh Manis' }], 'completed', 131, 21000),
  o('T7-033', 'Yoga', 'Meja 20', 'takeaway', [{ quantity: 1, name: 'Mie Ayam Bakso' }], 'completed', 98, 17000),
  o('T7-034', 'Lala', 'Meja 5', 'dine_in', [{ quantity: 1, name: 'Mie Ayam' }, { quantity: 2, name: 'Es Teh Manis' }], 'completed', 72, 21000),
  o('T7-035', 'Fajar', 'Meja 1', 'dine_in', [{ quantity: 1, name: 'Bakso Urat' }], 'cancelled', 41, 16000, { cancelReason: 'Bahan habis' }),
  o('T7-036', 'Putri', 'Meja 20', 'dine_in', [{ quantity: 1, name: 'Mie Ayam Bakso' }, { quantity: 1, name: 'Es Teh Manis' }], 'ready', 14, 21000),
  o('T7-038', 'Dina', 'Meja 12', 'dine_in', [{ quantity: 2, name: 'Mie Ayam', note: 'Satu tidak pakai sawi' }], 'accepted', 7, 26000),
  o('T7-039', 'Raka', 'Meja 5', 'takeaway', [{ quantity: 1, name: 'Bakso Urat', note: 'Tanpa seledri' }, { quantity: 1, name: 'Es Teh Manis' }], 'paid', 1, 20000),
  o('T7-040', 'Wulan', 'Meja 8', 'dine_in', [{ quantity: 3, name: 'Mie Ayam' }], 'paid', 0, 39000),
]

export const refunds: Refund[] = [
  { number: 'T9-017', tenantName: 'Segar Jaya', customerName: 'Nadia', amount: 12000, reason: 'Bahan habis', done: false },
  { number: 'T3-044', tenantName: 'Dapur Bu Sri', customerName: 'Arif', amount: 15000, reason: 'Tutup', done: true },
]

// Omzet hari ini tenant lain (T7 dihitung dari tenantOrders) dan omzet periode laporan.
export const todayOthers: Record<number, { orders: number; gross: number; active: number }> = {
  3: { orders: 28, gross: 412000, active: 3 }, 9: { orders: 31, gross: 296000, active: 2 }, 5: { orders: 0, gross: 0, active: 0 },
}

// "Sekarang" tetap 14.30 di data contoh supaya jam di rekap sama di server & browser (tanpa hydration mismatch).
export const clockFromAge = (ageMin: number) => {
  const t = 14 * 60 + 30 - ageMin
  return `${String(Math.floor(t / 60)).padStart(2, '0')}.${String(t % 60).padStart(2, '0')}`
}
export const periodGross: Record<number, number> = { 3: 5768000, 7: 6882000, 9: 3914000, 5: 2950000 }

export const diningTables: DiningTable[] = ['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5', 'Meja 12', 'Meja 20', 'Meja 34']
  .map((label, i) => ({ label, qrToken: `demo-token-${String(i + 1).padStart(2, '0')}` }))
