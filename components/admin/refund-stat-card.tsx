'use client'
import Link from 'next/link'
import { StatCard } from '@/components/stat-card'
import { rupiah } from '@/lib/rupiah'
import { usePendingRefunds } from './refund-store'

// Kartu "Perlu refund" di dashboard: merah bila ada yang belum selesai, klik membuka Laporan.
export function RefundStatCard() {
  const { count, amount } = usePendingRefunds()
  return (
    <Link
      href="/admin/laporan"
      className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <StatCard
        label="Perlu refund"
        value={count ? `${count} pesanan` : 'Tidak ada'}
        hint={count ? `${rupiah(amount)} belum dikembalikan · buka Laporan` : 'Semua refund sudah selesai'}
        tone={count ? 'danger' : 'default'}
        className="h-full"
      />
    </Link>
  )
}
