import { Pill } from '@/components/pill'

// Penanda jumlah refund yang belum selesai di menu Laporan (angka dari database, lihat AdminShell).
export function RefundBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <Pill tone="danger">
      {count}
      <span className="sr-only"> perlu refund</span>
    </Pill>
  )
}
