'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pill } from '@/components/pill'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rupiah } from '@/lib/rupiah'
import type { ReportRefund } from '@/lib/admin-report'
import { RowTh, TableWrap, Td, Th } from './data-table'
import { markRefundDone } from '@/app/admin/laporan/actions'

// Pesanan yang ditolak tenant setelah dibayar: uang dikembalikan manual oleh pengelola.
export function RefundList({ refunds }: { refunds: ReportRefund[] }) {
  const toast = useToast()
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState('')
  const [target, setTarget] = useState<ReportRefund | null>(null)
  const [open, setOpen] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const list = refunds.map((r) => ({ ...r, done: completed.has(r.id) }))
  const pending = list.filter((r) => !r.done)

  const confirm = () => {
    if (!target || saving) return
    setError('')
    startSaving(async () => {
      try {
        const result = await markRefundDone(target.id)
        if (result.error) return setError(result.error)
        setCompleted((current) => new Set(current).add(target.id))
        toast(`Refund ${target.number} ditandai selesai.`)
        setOpen(false)
        router.refresh()
      } catch { setError('Gagal mencatat refund. Periksa koneksi lalu coba lagi.') }
    })
  }

  return (
    <section aria-labelledby="perlu-refund" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="perlu-refund" className="text-lg font-bold">Perlu refund</h2>
        {pending.length > 0 && <Pill tone="danger">{pending.length} belum selesai</Pill>}
      </div>
      <p className="text-xs text-muted-foreground">Semua refund tertunda, tanpa batas tanggal. Kembalikan uang secara manual sebelum menandai selesai.</p>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-6 text-center text-muted-foreground">Tidak ada refund.</p>
      ) : (
        <>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Semua refund sudah selesai.</p>}
          <TableWrap caption="Pesanan yang uangnya perlu dikembalikan ke pembeli">
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Tenant</Th>
                <Th>Pembeli</Th>
                <Th right>Nominal</Th>
                <Th>Alasan</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <RowTh>{r.number}</RowTh>
                  <Td>{r.tenantName}</Td>
                  <Td>{r.customerName}</Td>
                  <Td right className="font-semibold">{rupiah(r.amount)}</Td>
                  <Td>{r.reason}</Td>
                  <Td right>
                    {r.done ? (
                      <Pill tone="brand">Selesai</Pill>
                    ) : (
                      <Button variant="outline" disabled={saving} onClick={() => { setTarget(r); setError(''); setOpen(true) }}>
                        Sudah direfund
                        <span className="sr-only"> {r.number}</span>
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai {target?.number} sudah direfund?</DialogTitle>
            <DialogDescription>
              Pastikan uang {target ? rupiah(target.amount) : ''} sudah dikembalikan ke {target?.customerName}. Pesanan ini akan keluar dari daftar yang perlu diurus.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={saving} />}>Belum</DialogClose>
            <Button disabled={saving} onClick={confirm}>{saving ? 'Menyimpan…' : 'Ya, sudah direfund'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
