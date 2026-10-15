import 'server-only'
import { z } from 'zod'

const qrResponse = z.object({
  id: z.string().min(1),
  reference_id: z.string(),
  type: z.literal('DYNAMIC'),
  currency: z.literal('IDR'),
  amount: z.number().int().positive().safe(),
  qr_string: z.string().min(1).max(4096),
  expires_at: z.iso.datetime({ offset: true }),
  status: z.literal('ACTIVE'),
})

export async function createQr(reference: string, amount: number, expiresAt: string) {
  const key = process.env.XENDIT_SECRET_KEY?.trim()
  if (!key) throw new Error('Xendit belum dikonfigurasi')
  const response = await fetch('https://api.xendit.co/qr_codes', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'api-version': '2022-07-31',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reference_id: reference, type: 'DYNAMIC', currency: 'IDR', amount, expires_at: expiresAt }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Xendit HTTP ${response.status}`)
  const qr = qrResponse.parse(await response.json())
  if (qr.amount !== amount || qr.reference_id !== reference || Date.parse(qr.expires_at) <= Date.now()
    || Date.parse(qr.expires_at) > Date.parse(expiresAt) + 1000) throw new Error('Respons QR tidak cocok')
  return qr
}
