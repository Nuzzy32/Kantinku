import { canteenName } from '@/lib/mock'
import type { DiningTable } from '@/lib/types'

const STEPS = ['Scan QR ini', 'Bayar QRIS', 'Ambil pesananmu']

// Satu kartu cetak. Ukuran semua huruf & jarak memakai satuan `cqw` (persen lebar kartu),
// jadi pratinjau di layar dan hasil cetak A4 tampil sama persis. QR sungguhan: Story 15.
export function QrCard({ table }: { table: DiningTable }) {
  return (
    <article className="@container flex aspect-[92/130] overflow-hidden rounded-lg border-2 border-dashed border-line-strong bg-card text-card-foreground print:rounded-none">
      <div className="flex flex-1 flex-col items-center justify-between p-[6cqw] text-center">
        <div>
          <p className="text-[5cqw] font-semibold tracking-widest text-muted-foreground uppercase">{canteenName}</p>
          <h3 className="text-[9.5cqw] leading-tight font-extrabold tracking-tight">Pesan di Sini!</h3>
        </div>
        <p className="max-w-full rounded-[2cqw] bg-primary px-[6cqw] py-[2cqw] text-[12cqw] leading-none font-extrabold break-words text-primary-foreground">
          {table.label}
        </p>
        <div
          role="img"
          aria-label={`Tempat QR untuk ${table.label}`}
          className="flex aspect-square w-[50cqw] flex-col items-center justify-center gap-[1cqw] rounded-[2cqw] border-2 border-dashed border-line-strong text-muted-foreground"
        >
          <span className="text-[6cqw] font-bold">Tempat QR</span>
          <span className="max-w-full px-[2cqw] text-[3.5cqw] break-all">/t/{table.qrToken}</span>
        </div>
        <ol className="grid w-full gap-[1.5cqw] text-left">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-[3cqw] text-[5cqw] font-semibold">
              <span className="grid size-[8cqw] shrink-0 place-items-center rounded-full bg-primary text-[5cqw] font-bold text-primary-foreground">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </article>
  )
}
