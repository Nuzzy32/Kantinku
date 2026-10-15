import type { Metadata } from 'next'
import { BuyerMenuProvider } from '@/components/buyer/buyer-cart'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { OrderScreen } from '@/components/buyer/order-screen'
import { getTableMenu } from '@/lib/menu'

export const metadata: Metadata = { title: 'Bayar pesanan' }

type Props = {
  params: Promise<{ publicToken: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { publicToken } = await params
  const { demo, meja } = await searchParams
  // ?meja=: meja asal, untuk mengosongkan keranjangnya dan tautan "Pesan lagi". Story 3 menggantinya dengan data checkout.
  // Data contoh: token apa pun menampilkan pesanan contoh. Story 3-4 mencari checkout dari publicToken.
  // ?demo=tolak: tenant terakhir menolak pesanan, untuk melihat kartu merah.
  return (
    <BuyerShell>
      <BuyerMenuProvider menu={typeof meja === 'string' ? await getTableMenu(meja) : null}>
        <OrderScreen key={publicToken} rejectDemo={demo === 'tolak'} />
      </BuyerMenuProvider>
    </BuyerShell>
  )
}
