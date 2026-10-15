import { cn } from '@/lib/utils'

// Kolom selebar HP di tengah layar (pembeli memakai HP; di desktop tampil sebagai kolom).
// `theme-buyer` memasang token oranye ESB + font Inter untuk seluruh anak. Dialog yang di-portal ke <body> harus
// memasang kelas ini sendiri di Popup-nya.
export function BuyerShell({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('theme-buyer mx-auto flex w-full max-w-[430px] flex-1 flex-col bg-background text-sm text-foreground sm:border-x', className)}
      {...props}
    />
  )
}
