import { cn } from '@/lib/utils'

export function StatCard({ label, value, hint, tone = 'default', className }: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'danger' | 'brand'
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', tone === 'danger' && 'border-destructive bg-danger-soft', tone === 'brand' && 'border-primary', className)}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold tracking-tight', tone === 'danger' && 'text-destructive')}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
