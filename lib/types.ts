// Bentuk data di UI. Mengikuti docs/schema.sql (camelCase). Uang = integer rupiah.
export type OrderStatus = 'pending_payment' | 'paid' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'expired'
export type ServiceType = 'dine_in' | 'takeaway'
export type PaymentMethod = 'qris' | 'cash'

export type Tenant = {
  id: number
  code: string // "T7"
  name: string
  kind: string // "Mie & bakso"
  isOpen: boolean
  isActive: boolean
  sharePercent: number
  email: string
}

export type MenuItem = {
  id: number
  tenantId: number
  category: string
  name: string
  price: number
  isAvailable: boolean // toggle "stok habis"
}

export type OrderItem = { quantity: number; name: string; note?: string }

// 1 order = 1 tenant dalam 1 checkout (schema: orders).
export type TenantOrder = {
  number: string // "T7-036"
  customerName: string
  tableLabel: string | null // null = dari kasir
  serviceType: ServiceType
  paymentMethod: PaymentMethod
  items: OrderItem[]
  status: OrderStatus
  ageMin: number // umur pesanan (menit) saat halaman dibuka. Jangan pakai Date.now() di data contoh (hydration).
  subtotal: number
  cancelReason?: string
}

export type Refund = {
  number: string
  tenantName: string
  customerName: string
  amount: number
  reason: string
  done: boolean
}

export type DiningTable = { label: string; qrToken: string }
