import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkoutInput } from '@/lib/checkout-input'
import { createQr } from '@/lib/xendit'

const fail = (error: string, status: number) => Response.json({ error }, { status })
// shortcut: batas per proses untuk pilot; gunakan penyimpanan bersama saat menjalankan beberapa instance.
const attempts = new Map<string, { count: number; until: number }>()

export async function POST(request: Request) {
  if (!process.env.XENDIT_SECRET_KEY?.trim()) return fail('Pembayaran QRIS belum tersedia. Hubungi pengelola kantin.', 503)
  if (!request.headers.get('content-type')?.includes('application/json')) return fail('Format pesanan tidak valid.', 415)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  const attempt = attempts.get(ip) ?? { count: 0, until: now + 60_000 }
  if (attempt.count >= 10 || attempts.size >= 10_000 && !attempts.has(ip)) return fail('Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.', 429)
  attempt.count++
  attempts.set(ip, attempt)

  let input
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).length > 32_768) return fail('Pesanan terlalu besar.', 413)
    input = checkoutInput.safeParse(JSON.parse(body))
  } catch { return fail('Format pesanan tidak valid.', 400) }
  if (!input.success) return fail('Periksa nama, nomor WA, dan isi pesananmu.', 400)
  const data = input.data
  let checkoutId: number | undefined
  try {
    const { data: table, error: tableError } = await supabaseAdmin.from('dining_tables').select('canteen_id').eq('qr_token', data.tableToken).maybeSingle()
    if (tableError) throw tableError
    if (!table) return fail('Meja tidak ditemukan. Scan ulang QR meja.', 404)
    const { data: checkout, error } = await supabaseAdmin.rpc('create_checkout', {
      p_canteen_id: table.canteen_id,
      p_table_token: data.tableToken,
      p_customer_name: data.customerName,
      p_customer_phone: data.customerPhone,
      p_service_type: data.serviceType,
      p_payment_method: 'qris',
      p_items: data.items,
    })
    if (error) {
      if (error.code === 'P0001' && /^(Menu tidak tersedia:|Menu habis:|Jumlah tidak valid:)| sedang tutup\. Hapus menunya dari pesanan\.$/.test(error.message)) return fail(error.message, 409)
      throw error
    }
    if (!checkout) throw new Error('Checkout kosong')
    checkoutId = checkout.id
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
    const qr = await createQr(checkout.public_token, checkout.total, expiresAt)
    const { data: saved, error: saveError } = await supabaseAdmin.from('checkouts').update({
      provider_ref: qr.id, qr_string: qr.qr_string, expires_at: qr.expires_at,
    }).eq('id', checkout.id).eq('payment_status', 'pending').select('id').maybeSingle()
    if (saveError || !saved) throw saveError ?? new Error('Checkout tidak tersimpan')
    return Response.json({ publicToken: checkout.public_token }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    if (checkoutId !== undefined) {
      try {
        const { error } = await supabaseAdmin.from('checkouts').update({ payment_status: 'failed' }).eq('id', checkoutId).eq('payment_status', 'pending')
        if (error) console.error('Gagal menandai checkout gagal', checkoutId)
      } catch { console.error('Gagal menandai checkout gagal', checkoutId) }
    }
    return fail('QRIS gagal dibuat. Keranjangmu tetap tersimpan. Coba lagi.', 502)
  }
}
