import type { Metadata } from 'next'
import { BuyerMenuProvider } from '@/components/buyer/buyer-cart'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { CheckoutScreen } from '@/components/buyer/checkout-screen'
import { TableNotFound } from '@/components/buyer/table-not-found'
import { getTableMenu } from '@/lib/menu'

export const metadata: Metadata = { title: 'Pesanan kamu' }

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

// ?meja=<qr_token>: keranjang milik meja itu. Menu diambil ulang supaya harga dan status habis/tutup terbaru.
export default async function CheckoutPage({ searchParams }: Props) {
  const { meja } = await searchParams
  const menu = typeof meja === 'string' ? await getTableMenu(meja) : null
  if (!menu) return <TableNotFound />
  return (
    <BuyerShell>
      <BuyerMenuProvider menu={menu}>
        <CheckoutScreen />
      </BuyerMenuProvider>
    </BuyerShell>
  )
}
