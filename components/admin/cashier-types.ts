import type { MenuItem, ServiceType, TenantSummary } from '@/lib/types'

export type CartGroup = {
  tenant: TenantSummary
  lines: { item: MenuItem; qty: number }[]
  subtotal: number
}

// Satu pesanan tunai = 1 checkout, dipecah jadi 1 pesanan per tenant (parts).
export type CashSale = {
  id: number
  time: string
  customerName: string
  service: ServiceType
  total: number
  received: number | null
  parts: { number: string; tenantName: string; items: string; subtotal: number }[]
}

export const SERVICE_LABEL: Record<ServiceType, string> = { dine_in: 'Makan di sini', takeaway: 'Bawa pulang' }

// Batas per menu, sama dengan validasi create_checkout (1-50).
export const MAX_QTY = 50
