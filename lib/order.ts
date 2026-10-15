import 'server-only'
import QRCode from 'qrcode'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { OrderStatus } from '@/lib/types'
import type { Snapshot } from '@/components/buyer/order-snapshot'

export type PublicOrder = {
  publicToken: string
  paymentStatus: 'pending' | 'paid' | 'expired' | 'failed'
  expiresAt: string | null
  qrImage: string | null
  menuHref: string | null
  snapshot: Snapshot
  statuses: Record<number, OrderStatus>
}

// Token UUID memberi akses ke pesanan ini; jangan kirim telepon atau ID internal checkout.
export async function getPublicOrder(token: string): Promise<PublicOrder | null> {
  if (!z.uuid().safeParse(token).success) return null
  const { data, error } = await supabaseAdmin.from('checkouts').select(`
    public_token, payment_status, expires_at, qr_string, total,
    table:dining_tables(qr_token),
    orders(id, status, subtotal, cancel_reason,
      tenant:tenants(id, code, name, is_open),
      order_items(id, quantity, name, note))
  `).eq('public_token', token).maybeSingle()
  if (error) throw error
  if (!data) return null
  const expired = data.payment_status === 'pending' && data.expires_at !== null && Date.parse(data.expires_at) <= Date.now()
  const paymentStatus = expired ? 'expired' : data.payment_status
  return {
    publicToken: data.public_token,
    paymentStatus,
    expiresAt: data.expires_at,
    qrImage: paymentStatus === 'pending' && data.qr_string
      ? await QRCode.toDataURL(data.qr_string, { width: 576, margin: 4, errorCorrectionLevel: 'M' }) : null,
    menuHref: data.table ? `/t/${data.table.qr_token}` : null,
    snapshot: {
      total: data.total,
      groups: data.orders.map((order) => ({
        tenant: { id: order.tenant.id, code: order.tenant.code, name: order.tenant.name, isOpen: order.tenant.is_open },
        number: `${order.tenant.code}-${String(order.id % 1000).padStart(3, '0')}`,
        subtotal: order.subtotal,
        cancelReason: order.cancel_reason ?? undefined,
        items: order.order_items.toSorted((a, b) => a.id - b.id).map((item) => ({ quantity: item.quantity, name: item.name, note: item.note ?? undefined })),
      })),
    },
    statuses: Object.fromEntries(data.orders.map((order) => [order.tenant.id, order.status])),
  }
}
