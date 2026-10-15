import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizes = { md: 'size-18 [&_svg]:size-7', sm: 'size-12 [&_svg]:size-5' } as const

// Foto menu (Supabase Storage) atau kotak abu polos berukuran sama, jadi tidak ada layout shift. `muted` = habis / tutup: hitam-putih.
export function MenuPhoto({ size = 'md', muted = false, src }: { size?: keyof typeof sizes; muted?: boolean; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- sudah dikompres ≤ 300KB saat upload; tanpa konfigurasi domain gambar
    return <img src={src} alt="" loading="lazy" className={cn('shrink-0 rounded-lg bg-muted object-cover', sizes[size], muted && 'grayscale')} />
  }
  return (
    <div aria-hidden className={cn('grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/40', sizes[size], muted && 'grayscale')}>
      <UtensilsCrossed />
    </div>
  )
}
