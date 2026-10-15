import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizes = { md: 'size-18 [&_svg]:size-7', sm: 'size-12 [&_svg]:size-5' } as const

// Foto menu belum aktif: kotak abu polos berukuran tetap supaya tidak ada layout shift saat foto asli dipasang.
// `muted` = habis / tutup: foto asli nanti dibuat hitam-putih.
export function MenuPhoto({ size = 'md', muted = false }: { size?: keyof typeof sizes; muted?: boolean }) {
  return (
    <div aria-hidden className={cn('grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/40', sizes[size], muted && 'grayscale')}>
      <UtensilsCrossed />
    </div>
  )
}
