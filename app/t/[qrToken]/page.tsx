import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BuyerMenuProvider } from '@/components/buyer/buyer-cart'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { MenuScreen } from '@/components/buyer/menu-screen'
import { getTableMenu } from '@/lib/menu'

export const metadata: Metadata = { title: 'Menu' }

type Props = {
  params: Promise<{ qrToken: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { qrToken } = await params
  const [menu, { tutup }] = await Promise.all([getTableMenu(qrToken), searchParams])
  if (!menu) notFound()
  // ?tutup=1: kantin tutup, untuk melihat tampilannya (jam buka kantin belum dipakai untuk menutup otomatis).
  return (
    <BuyerShell>
      <BuyerMenuProvider menu={menu}>
        <MenuScreen menu={menu} canteenClosed={tutup === '1'} />
      </BuyerMenuProvider>
    </BuyerShell>
  )
}
