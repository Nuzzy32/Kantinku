'use client'
import { useState } from 'react'
import { Pill } from '@/components/pill'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rupiah } from '@/lib/rupiah'
import type { Refund } from '@/lib/types'
import { RowTh, TableWrap, Td, Th } from './data-table'
import { markRefundDone, useRefunds } from './refund-store'

// Pesanan yang ditolak tenant setelah dibayar: uang dikembalikan manual oleh pengelola.
export function RefundList() {
  const toast = useToast()
  const all = useRefunds()
  const [target, setTarget] = useState<Refund | null>(null)
  const [open, setOpen] = useState(false)

  const list = [...all].sort((a, b) => Number(a.done) - Number(b.done)) // yang belum selesai di atas
  const pending = list.filter((r) => !r.done)

  const confirm = () => {
    if (!target) return
    markRefundDone(target.number)
    toast(`Refund ${target.number} ditandai selesai.`)
    setOpen(false)
  }

  return (
    <section aria-labelledby="perlu-refund" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="perlu-refund" className="text-lg font-bold">Perlu refund</h2>
        {pending.length > 0 && <Pill tone="danger">{pending.length} belum selesai</Pill>}
      </div>

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
                <tr key={r.number} className="border-b last:border-b-0">
                  <RowTh>{r.number}</RowTh>
                  <Td>{r.tenantName}</Td>
                  <Td>{r.customerName}</Td>
                  <Td right className="font-semibold">{rupiah(r.amount)}</Td>
                  <Td>{r.reason}</Td>
                  <Td right>
                    {r.done ? (
                      <Pill tone="brand">Selesai</Pill>
                    ) : (
                      <Button variant="outline" onClick={() => { setTarget(r); setOpen(true) }}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai {target?.number} sudah direfund?</DialogTitle>
            <DialogDescription>
              Pastikan uang {target ? rupiah(target.amount) : ''} sudah dikembalikan ke {target?.customerName}. Pesanan ini akan keluar dari daftar yang perlu diurus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Belum</DialogClose>
            <Button onClick={confirm}>Ya, sudah direfund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
