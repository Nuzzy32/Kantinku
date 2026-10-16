import 'server-only'
import { z } from 'zod'

// Kontrak QR Codes api-version 2022-07-31 (bukan webhook Payments API v3).
// Hanya field yang dipakai yang wajib: payload asli belum pernah diuji, jadi field tambahan/berbeda tidak boleh
// membuat semua konfirmasi pembayaran gagal. type/currency diperiksa bila ada.
export const qrPayment = z.object({
  id: z.string().min(1), qr_id: z.string().min(1), reference_id: z.uuid(),
  type: z.literal('DYNAMIC').optional(), currency: z.literal('IDR').optional(), status: z.literal('SUCCEEDED'),
  amount: z.number().int().positive().safe(),
})

export async function listQrPayments(qrId: string) {
  const key = process.env.XENDIT_SECRET_KEY?.trim()
  if (!key) throw new Error('Xendit belum dikonfigurasi')
  const response = await fetch(`https://api.xendit.co/qr_codes/${encodeURIComponent(qrId)}/payments`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'api-version': '2022-07-31' },
    cache: 'no-store', signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error('Pembayaran belum bisa diperiksa')
  // Satu entri yang bentuknya lain (mis. status bukan SUCCEEDED) dilewati, bukan menggagalkan seluruh pemeriksaan.
  const { data } = z.object({ data: z.array(z.unknown()) }).parse(await response.json())
  return data.flatMap((item) => { const p = qrPayment.safeParse(item); return p.success ? [p.data] : [] })
}

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
