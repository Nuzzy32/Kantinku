import { rupiah } from '@/lib/rupiah'
import type { AdminReport } from '@/lib/admin-report'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/pill'
import { RowTh, TableWrap, Td, Th } from './data-table'
import { Field } from './field'
import { RefundList } from './refund-list'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function ReportView({ report: { period, rows, refunds } }: { report: AdminReport }) {
  const { from, to, today, error } = period
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + pick(r), 0)
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground">Bagi hasil per tenant dan refund yang perlu diurus.</p>
      </div>

      <section aria-labelledby="bagi-hasil" className="flex flex-col gap-3">
        <h2 id="bagi-hasil" className="text-lg font-bold">Bagi hasil</h2>
        <form action="/admin/laporan" method="get" className="flex flex-wrap items-end gap-4">
          <Field label="Dari" name="from" type="date" defaultValue={from} max={today} required className="w-48" />
          <Field label="Sampai" name="to" type="date" defaultValue={to} max={today} required className="w-48" />
          <Button type="submit">Tampilkan laporan</Button>
        </form>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        {!error && (
          <>
            <TableWrap caption={`Bagi hasil per tenant, ${fmtDate(from)} sampai ${fmtDate(to)}`}>
              <thead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Tenant</Th>
                  <Th right>Bagi hasil</Th>
                  <Th right>Omzet</Th>
                  <Th right>Bagian pengelola</Th>
                  <Th right>Bagian tenant</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tenant, gross, canteen, tenantShare }) => (
                  <tr key={tenant.id} className="border-b">
                    <RowTh>{tenant.code}</RowTh>
                    <Td className="font-medium">{tenant.name} {!tenant.is_active && <Pill tone="neutral">Nonaktif</Pill>}</Td>
                    <Td right>{Number(tenant.revenue_share_percent).toLocaleString('id-ID')}%</Td>
                    <Td right>{rupiah(gross)}</Td>
                    <Td right>{rupiah(canteen)}</Td>
                    <Td right>{rupiah(tenantShare)}</Td>
                  </tr>
                ))}
                {!rows.length && <tr><Td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada tenant di kantin ini.</Td></tr>}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <RowTh colSpan={3}>Total {fmtDate(from)} – {fmtDate(to)}</RowTh>
                  <Td right>{rupiah(sum((r) => r.gross))}</Td>
                  <Td right>{rupiah(sum((r) => r.canteen))}</Td>
                  <Td right>{rupiah(sum((r) => r.tenantShare))}</Td>
                </tr>
              </tfoot>
            </TableWrap>
            <p className="text-xs text-muted-foreground">
              Berdasarkan tanggal pembayaran WIB. Pesanan yang ditolak tidak dihitung. Bagian pengelola dan tenant dijumlahkan dari rekap harian.
            </p>
          </>
        )}
      </section>

      <RefundList refunds={refunds} />
    </div>
  )
}
