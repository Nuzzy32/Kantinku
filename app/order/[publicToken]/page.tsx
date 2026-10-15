import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicOrder } from '@/lib/order'
import { PaymentScreen } from '@/components/buyer/payment-screen'
import { BuyerMenuProvider } from '@/components/buyer/buyer-cart'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { OrderScreen } from '@/components/buyer/order-screen'
import { getTableMenu } from '@/lib/menu'

export const metadata: Metadata = { title: 'Bayar pesanan', robots: { index: false, follow: false }, referrer: 'no-referrer' }

type Props = {
  params: Promise<{ publicToken: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { publicToken } = await params
  const { demo, meja } = await searchParams
  if (publicToken !== 'demo' || process.env.NODE_ENV === 'production') {
    const order = await getPublicOrder(publicToken)
    if (!order) notFound()
    return <BuyerShell><PaymentScreen initial={order} /></BuyerShell>
  }
  // Simulasi tetap tersedia hanya di development, terpisah dari checkout asli.
  return (
    <BuyerShell>
      <BuyerMenuProvider menu={typeof meja === 'string' ? await getTableMenu(meja) : null}>
        <OrderScreen key={publicToken} rejectDemo={demo === 'tolak'} />
      </BuyerMenuProvider>
    </BuyerShell>
  )
}
