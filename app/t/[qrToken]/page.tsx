import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { MenuScreen } from '@/components/buyer/menu-screen'

export const metadata: Metadata = { title: 'Menu' }

type Props = {
  params: Promise<{ qrToken: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { qrToken } = await params
  const { tutup } = await searchParams
  // Data contoh: token apa pun = Meja 34, kecuali "salah". Story 1 mengganti ini dengan pencarian token di database.
  if (qrToken === 'salah') notFound()
  // ?tutup=1: kantin tutup, untuk melihat tampilannya.
  return (
    <BuyerShell>
      <MenuScreen canteenClosed={tutup === '1'} />
    </BuyerShell>
  )
}
