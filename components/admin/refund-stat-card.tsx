import Link from 'next/link'
import { StatCard } from '@/components/stat-card'

// Kartu "Perlu refund" di dashboard: merah bila ada yang belum selesai, klik membuka Laporan.
export function RefundStatCard({ count }: { count: number }) {
  return (
    <Link
      href="/admin/laporan"
      className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <StatCard
        label="Perlu refund"
        value={count ? `${count} pesanan` : 'Tidak ada'}
        hint={count ? 'Belum dikembalikan · semua tanggal · buka Laporan' : 'Tidak ada refund tertunda'}
        tone={count ? 'danger' : 'default'}
        className="h-full"
      />
    </Link>
  )
}
