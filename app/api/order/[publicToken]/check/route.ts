import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPublicOrder } from '@/lib/order'
import { listQrPayments } from '@/lib/xendit'
import { recordQrPayment } from '@/lib/payment'

// shortcut: jeda per token per proses; gunakan rate limiter bersama sebelum deployment banyak instance.
const checks = new Map<string, number>()
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(_request: Request, { params }: { params: Promise<{ publicToken: string }> }) {
  const { publicToken } = await params
  if (!z.uuid().safeParse(publicToken).success) return fail('Pesanan tidak ditemukan.', 404)
  const now = Date.now()
  for (const [key, until] of checks) if (until <= now) checks.delete(key)
  if (checks.has(publicToken)) return fail('Tunggu beberapa detik sebelum memeriksa lagi.', 429)
  try {
    const { data: checkout, error } = await supabaseAdmin.from('checkouts')
      .select('provider_ref, payment_status, payment_method').eq('public_token', publicToken).maybeSingle()
    if (error) throw error
    if (!checkout) return fail('Pesanan tidak ditemukan.', 404)
    // Jeda dipasang hanya untuk pesanan yang ada: UUID acak tidak bisa memenuhi map dan memblokir pembeli lain.
    checks.set(publicToken, now + 5000)
    if (checkout.payment_status !== 'paid' && checkout.payment_method === 'qris' && checkout.provider_ref) {
      if (!process.env.XENDIT_SECRET_KEY?.trim()) return fail('Pemeriksaan QRIS belum tersedia. Hubungi pengelola.', 503)
      const payments = await listQrPayments(checkout.provider_ref)
      for (const payment of payments) {
        if (payment.reference_id !== publicToken || payment.qr_id !== checkout.provider_ref) continue
        const result = await recordQrPayment(payment)
        if (result.error) return fail(result.error, result.status)
        break
      }
    }
    const order = await getPublicOrder(publicToken)
    return order ? Response.json(order, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } }) : fail('Pesanan tidak ditemukan.', 404)
  } catch { return fail('Status belum bisa diperiksa. Coba lagi sebentar.', 503) }
}
