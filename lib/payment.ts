import 'server-only'
import type { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { qrPayment } from '@/lib/xendit'

export async function recordQrPayment(payment: z.infer<typeof qrPayment>) {
  const { data: checkout, error } = await supabaseAdmin.from('checkouts')
    .select('id, total, payment_method, provider_ref').eq('public_token', payment.reference_id).maybeSingle()
  if (error) throw error
  if (!checkout) return { error: 'Pesanan tidak ditemukan.', status: 404 }
  if (checkout.payment_method !== 'qris' || checkout.total !== payment.amount
    || checkout.provider_ref && checkout.provider_ref !== payment.qr_id) {
    // Uang mungkin sudah masuk tapi tidak dicatat lunas: tinggalkan jejak untuk rekonsiliasi (tanpa data pribadi).
    console.error('Pembayaran QRIS tidak cocok', { checkoutId: checkout.id, paymentId: payment.id, qrId: payment.qr_id, amount: payment.amount })
    return { error: 'Data pembayaran tidak cocok.', status: 409 }
  }
  // Callback bisa tiba sebelum respons pembuatan QR tersimpan, termasuk setelah kegagalan jaringan.
  if (!checkout.provider_ref) {
    const { data: saved, error } = await supabaseAdmin.from('checkouts').update({ provider_ref: payment.qr_id })
      .eq('id', checkout.id).is('provider_ref', null).select('id').maybeSingle()
    if (error || !saved) throw new Error('Referensi pembayaran belum tersimpan')
  }
  const paid = await supabaseAdmin.rpc('mark_checkout_paid', { p_checkout_id: checkout.id, p_amount: payment.amount })
  if (paid.error) throw paid.error
  return { status: 200 }
}
