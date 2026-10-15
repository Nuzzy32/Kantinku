import { rupiah } from '@/lib/rupiah'
import { SERVICE_LABEL, type CashSale } from './cashier-types'
import { RowTh, TableWrap, Td, Th } from './data-table'

// Riwayat pesanan tunai sesi ini (hilang saat halaman dimuat ulang; Story 16 mengambil dari database).
export function CashierHistory({ sales }: { sales: CashSale[] }) {
  if (sales.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground">
        Belum ada pesanan tunai di sesi ini.
      </p>
    )
  }
  const sum = sales.reduce((a, s) => a + s.total, 0)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {sales.length} pesanan tunai · total <strong className="text-foreground">{rupiah(sum)}</strong>
      </p>
      <TableWrap caption="Pesanan tunai di sesi kasir ini, terbaru di atas">
        <thead>
          <tr>
            <Th>Jam</Th>
            <Th>Pembeli</Th>
            <Th>Pesanan masuk ke</Th>
            <Th right>Total</Th>
            <Th right>Diterima</Th>
            <Th right>Kembalian</Th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="border-b align-top last:border-b-0">
              <RowTh>{s.time}</RowTh>
              <Td>
                <div className="font-semibold">{s.customerName}</div>
                <div className="text-xs text-muted-foreground">{SERVICE_LABEL[s.service]}</div>
              </Td>
              <Td>
                <ul className="flex flex-col gap-1">
                  {s.parts.map((p) => (
                    <li key={p.number}>
                      <span className="font-semibold">{p.number}</span> <span className="text-muted-foreground">{p.tenantName}</span>
                      <div className="text-xs text-ink-2">{p.items}</div>
                    </li>
                  ))}
                </ul>
              </Td>
              <Td right className="font-semibold">{rupiah(s.total)}</Td>
              <Td right>{rupiah(s.received)}</Td>
              <Td right>{rupiah(s.received - s.total)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  )
}
