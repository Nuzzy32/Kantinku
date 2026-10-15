import { QrCode } from 'lucide-react'
import { BuyerShell } from '@/components/buyer/buyer-shell'

export default function TableNotFound() {
  return (
    <BuyerShell>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-accent text-brand-line">
          <QrCode aria-hidden className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Meja tidak ditemukan</h1>
        <p className="text-muted-foreground">Kode QR ini tidak dikenali atau sudah tidak berlaku.</p>
        <ol className="w-full list-decimal space-y-1 rounded-2xl border border-border bg-card py-4 pr-4 pl-9 text-left text-muted-foreground">
          <li>Scan ulang QR yang ada di mejamu.</li>
          <li>Pastikan seluruh kotak QR terlihat di kamera.</li>
          <li>Masih gagal? Tanyakan petugas kantin.</li>
        </ol>
      </main>
    </BuyerShell>
  )
}
