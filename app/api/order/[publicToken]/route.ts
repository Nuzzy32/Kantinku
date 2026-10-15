import { getPublicOrder } from '@/lib/order'

export async function GET(_request: Request, { params }: { params: Promise<{ publicToken: string }> }) {
  try {
    const { publicToken } = await params
    const order = await getPublicOrder(publicToken)
    return Response.json(order ?? { error: 'Pesanan tidak ditemukan.' }, {
      status: order ? 200 : 404,
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    })
  } catch {
    return Response.json({ error: 'Status pesanan belum bisa dimuat. Coba lagi.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
