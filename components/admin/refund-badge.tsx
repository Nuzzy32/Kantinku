'use client'
import { Pill } from '@/components/pill'
import { usePendingRefunds } from './refund-store'

// Penanda jumlah refund yang belum selesai di menu Laporan.
export function RefundBadge() {
  const { count } = usePendingRefunds()
  if (!count) return null
  return (
    <Pill tone="danger">
      {count}
      <span className="sr-only"> perlu refund</span>
    </Pill>
  )
}
