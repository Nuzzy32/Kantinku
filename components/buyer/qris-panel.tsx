'use client'
import { Clock, Download, QrCode } from 'lucide-react'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { rupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

const steps = ['Simpan atau screenshot QR', 'Buka e-wallet atau m-banking, pilih scan QRIS', 'Bayar. Halaman ini berubah otomatis']

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Fase Bayar. `total` null = keranjang belum terbaca (hydration). Judul halaman ("Pembayaran") ada di PageHeader.
export function QrisPanel({ total, remaining, onPaid, onSkip, qrImage, checking = false }: {
  total: number | null
  remaining: number
  onPaid: () => void
  onSkip?: () => void
  qrImage?: string | null
  checking?: boolean
}) {
  const toast = useToast()
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-6">
      <div className="text-center">
        <p className="text-muted-foreground">Total pembayaran</p>
        {total === null
          ? <div className="mx-auto mt-2 h-10 w-44 animate-pulse rounded-lg bg-muted" />
          : <p className="mt-1 text-4xl font-bold tracking-tight">{rupiah(total)}</p>}
        <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock aria-hidden className="size-4" />
          Bayar dalam <span aria-live="off" className={cn('font-bold text-foreground', remaining < 60 && 'text-destructive')}>{mmss(remaining)}</span>
          <span className="sr-only">. Batas waktu bayar 10 menit.</span>
        </p>
      </div>

      {qrImage ? (
        // PNG lokal dari payload Xendit, tanpa layanan QR pihak ketiga.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrImage} width={288} height={288} alt="Kode QRIS untuk membayar pesanan" className="mx-auto aspect-square w-72 max-w-full bg-white" />
      ) : <div
        role="img"
        aria-label="Kode QRIS untuk membayar pesanan (contoh tampilan)"
        className="mx-auto flex aspect-square w-full max-w-72 min-w-65 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-line bg-card text-muted-foreground"
      >
        <QrCode aria-hidden className="size-16" />
        <span className="text-base font-bold text-foreground">QRIS dinamis</span>
      </div>}

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl border-brand-line font-bold text-primary hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            if (!qrImage) return toast('Gambar QR disimpan (contoh tampilan).')
            const link = document.createElement('a')
            link.href = qrImage
            link.download = 'kantinku-qris.png'
            link.click()
          }}
        >
          <Download aria-hidden />
          Simpan gambar QR
        </Button>
        <Button size="lg" className="rounded-xl font-bold" onClick={onPaid} disabled={checking}>{checking ? 'Memeriksa pembayaran…' : 'Saya sudah bayar'}</Button>
        {process.env.NODE_ENV !== 'production' && onSkip && (
          <Button variant="ghost" className="border-dashed border-line-strong" onClick={onSkip}>Simulasi: lewati 10 menit</Button>
        )}
      </div>
    </div>
  )
}
