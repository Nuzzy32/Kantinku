import { cn } from '@/lib/utils'

const tones = {
  neutral: 'bg-muted text-ink-2',
  ink: 'bg-foreground text-background',
  brand: 'bg-brand-soft text-accent-foreground',
  danger: 'bg-danger-soft text-destructive',
  warn: 'bg-warn-soft text-warn',
} as const

// Status = teks + warna (jangan hanya warna).
export function Pill({ tone = 'neutral', className, ...props }: React.ComponentProps<'span'> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-bold tracking-wide uppercase', tones[tone], className)}
      {...props}
    />
  )
}
