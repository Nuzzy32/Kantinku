import type { Metadata } from 'next'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { OrderScreen } from '@/components/buyer/order-screen'

export const metadata: Metadata = { title: 'Bayar pesanan' }

type Props = {
  params: Promise<{ publicToken: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { publicToken } = await params
  const { demo } = await searchParams
  // Data contoh: token apa pun menampilkan pesanan contoh. Story 3-4 mencari checkout dari publicToken.
  // ?demo=tolak: tenant terakhir menolak pesanan, untuk melihat kartu merah.
  return (
    <BuyerShell>
      <OrderScreen key={publicToken} rejectDemo={demo === 'tolak'} />
    </BuyerShell>
  )
}
