import { MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { BuyerShell } from '@/components/buyer/buyer-shell'
import { canteenAddress, menuHref } from '@/components/buyer/canteen'
import { OpeningHours } from '@/components/buyer/opening-hours'
import { PageHeader } from '@/components/buyer/page-header'
import { canteenName } from '@/lib/mock'

export const metadata: Metadata = { title: 'Info kantin' }

export default function InfoPage() {
  return (
    <BuyerShell>
      <PageHeader title="Info Kantin" backHref={menuHref} backLabel="Kembali ke menu" />
      <main className="flex flex-col gap-6 p-4">
        <section aria-labelledby="canteen-name">
          <h2 id="canteen-name" className="text-xl font-bold">{canteenName}</h2>
          <p className="mt-1.5 flex items-start gap-2 text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-line" />
            {canteenAddress}
          </p>
        </section>
        <OpeningHours />
      </main>
    </BuyerShell>
  )
}
