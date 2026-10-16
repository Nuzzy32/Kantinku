import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { qrPayment } from '@/lib/xendit'
import { recordQrPayment } from '@/lib/payment'

const fail = (error: string, status: number) => Response.json({ error }, { status })

export async function POST(request: Request) {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN?.trim()
  if (!expected) return fail('Konfirmasi pembayaran belum tersedia.', 503)
  const token = request.headers.get('x-callback-token') ?? ''
  const actual = Buffer.from(token)
  const secret = Buffer.from(expected)
  if (actual.length !== secret.length || !timingSafeEqual(actual, secret)) return fail('Konfirmasi tidak diizinkan.', 401)
  let payload
  try {
    const body = await request.text()
    if (Buffer.byteLength(body) > 32_768) return fail('Data pembayaran terlalu besar.', 413)
    payload = z.object({ event: z.literal('qr.payment'), api_version: z.literal('2022-07-31'), data: qrPayment }).safeParse(JSON.parse(body))
  } catch { return fail('Data pembayaran tidak valid.', 400) }
  if (!payload.success) return fail('Data pembayaran tidak valid.', 400)
  try {
    const result = await recordQrPayment(payload.data.data)
    return result.error ? fail(result.error, result.status) : Response.json({ received: true })
  } catch { return fail('Konfirmasi pembayaran belum tersimpan. Coba lagi.', 503) }
}
