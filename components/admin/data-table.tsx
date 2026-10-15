import { cn } from '@/lib/utils'

// Pembungkus tabel admin: bisa digeser mendatar di layar sempit, `caption` dibaca pembaca layar.
export function TableWrap({ caption, className, children }: { caption: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border bg-card', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ right, className, ...props }: React.ComponentProps<'th'> & { right?: boolean }) {
  return (
    <th
      scope="col"
      className={cn('border-b bg-muted/50 px-4 py-3 text-xs font-bold tracking-wide whitespace-nowrap text-ink-2 uppercase', right ? 'text-right' : 'text-left', className)}
      {...props}
    />
  )
}

// Sel kepala baris (kode/nomor) supaya pembaca layar tahu baris ini milik siapa.
export function RowTh({ className, ...props }: React.ComponentProps<'th'>) {
  return <th scope="row" className={cn('px-4 py-3 text-left font-semibold whitespace-nowrap', className)} {...props} />
}

export function Td({ right, className, ...props }: React.ComponentProps<'td'> & { right?: boolean }) {
  return <td className={cn('px-4 py-3 align-middle', right && 'text-right', className)} {...props} />
}
