'use client'
import { useState } from 'react'
import { periodGross, tenants } from '@/lib/mock'
import { canteenShare, rupiah } from '@/lib/rupiah'
import { RowTh, TableWrap, Td, Th } from './data-table'
import { Field } from './field'
import { RefundList } from './refund-list'

const TODAY = '2026-10-15' // "hari ini" tetap di data contoh
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// Bagi hasil sama dengan view tenant_daily_revenue: bagian pengelola = round(omzet x %), sisanya bagian tenant.
const rows = [...tenants]
  .sort((a, b) => a.id - b.id)
  .map((t) => {
    const gross = periodGross[t.id] ?? 0
    const canteen = canteenShare(gross, t.sharePercent)
    return { tenant: t, gross, canteen, tenantShare: gross - canteen }
  })
const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + pick(r), 0)

export function ReportView() {
  const [from, setFrom] = useState('2026-10-01')
  const [to, setTo] = useState(TODAY)

  const fromError = from ? '' : 'Isi tanggal Dari.'
  const toError = !to ? 'Isi tanggal Sampai.' : from && from > to ? 'Tanggal Sampai tidak boleh sebelum Dari.' : ''
  const error = fromError || toError

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground">Bagi hasil per tenant dan refund yang perlu diurus.</p>
      </div>

      <section aria-labelledby="bagi-hasil" className="flex flex-col gap-3">
        <h2 id="bagi-hasil" className="text-lg font-bold">Bagi hasil</h2>
        <div className="flex flex-wrap items-start gap-4">
          <Field label="Dari" type="date" value={from} max={to || TODAY} onChange={(e) => setFrom(e.target.value)} error={fromError} className="w-48" />
          <Field label="Sampai" type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} error={toError} className="w-48" />
        </div>

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
                    <Td className="font-medium">{tenant.name}</Td>
                    <Td right>{tenant.sharePercent.toLocaleString('id-ID')}%</Td>
                    <Td right>{rupiah(gross)}</Td>
                    <Td right>{rupiah(canteen)}</Td>
                    <Td right>{rupiah(tenantShare)}</Td>
                  </tr>
                ))}
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
              Pesanan yang ditolak tidak dihitung. Data contoh: angka belum berubah mengikuti tanggal.
            </p>
          </>
        )}
      </section>

      <RefundList />
    </div>
  )
}
