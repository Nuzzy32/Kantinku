import type { Metadata } from 'next'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { CheckoutScreen } from '@/components/buyer/checkout-screen'

export const metadata: Metadata = { title: 'Pesanan kamu' }

export default function CheckoutPage() {
  return (
    <BuyerShell>
      <CheckoutScreen />
    </BuyerShell>
  )
}
