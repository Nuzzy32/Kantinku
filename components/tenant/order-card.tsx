'use client'
import { BellRing, Check, Clock, PackageCheck, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/pill'
import { useToast } from '@/components/toast'
import type { LiveTenantOrder } from '@/lib/tenant-order-data'
import { canReject, forwardStatus, useTenant } from './tenant-provider'

const service = { dine_in: 'Makan di sini', takeaway: 'Bawa pulang' } as const

// Teks tombol utama per status + kalimat toast setelahnya.
const forward = {
  paid: { label: 'Terima', Icon: Check, done: 'diterima' },
  accepted: { label: 'Siap', Icon: BellRing, done: 'siap diambil' },
  ready: { label: 'Selesai diambil', Icon: PackageCheck, done: 'selesai diambil' },
} as const

// Netral < 5 mnt, kuning 5-9, merah >= 10. Ikon peringatan menemani warna.
function AgeBadge({ minutes }: { minutes: number }) {
  const tone = minutes >= 10 ? 'danger' : minutes >= 5 ? 'warn' : 'neutral'
  const Icon = tone === 'neutral' ? Clock : TriangleAlert
  return (
    <Pill tone={tone} className="shrink-0 gap-1 px-2.5 py-1 text-base normal-case">
      <Icon className="size-4" aria-hidden />
      {minutes} mnt
    </Pill>
  )
}

export function OrderCard({ order, onReject }: { order: LiveTenantOrder; onReject: (order: LiveTenantOrder) => void }) {
  const { moveOrder, pending, elapsedMin } = useTenant()
  const toast = useToast()
  const to = forwardStatus(order.status)
  const step = order.status === 'paid' || order.status === 'accepted' || order.status === 'ready' ? forward[order.status] : null

  const advance = async () => {
    if (!to || !step) return
    if (await moveOrder(order.id, to)) toast(`${order.number} ${step.done}.`)
  }

  const where = order.tableLabel ? `${order.tableLabel} · ${service[order.serviceType]}` : `${order.paymentMethod === 'cash' ? 'Kasir · Tunai' : 'Tanpa meja · QRIS'} · ${service[order.serviceType]}`

  return (
    <article aria-label={`Pesanan ${order.number}`} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-extrabold tracking-tight">{order.number}</div>
          <div className="text-lg font-semibold">{order.customerName}</div>
        </div>
        {order.status !== 'ready' && <AgeBadge minutes={order.ageMin + elapsedMin} />}
      </div>
      <div className="text-base text-ink-2">{where}</div>
      <ul className="flex flex-col gap-2 border-t pt-3">
        {order.items.map((item, i) => (
          <li key={i}>
            <div className="text-lg">
              <span className="font-extrabold">{item.quantity}×</span> {item.name}
            </div>
            {item.note && <p className="mt-1 rounded-md bg-warn-soft px-2 py-1.5 text-base font-semibold text-warn">Catatan: {item.note}</p>}
          </li>
        ))}
      </ul>
      {step && (
        <div className="mt-1 flex gap-2">
          <Button size="lg" className="flex-1" onClick={advance} disabled={pending.includes(order.id)} aria-busy={pending.includes(order.id)}>
            <step.Icon aria-hidden />
            {step.label}
          </Button>
          {canReject(order.status) && (
            <Button variant="destructive" size={order.status === 'paid' ? 'lg' : 'default'} onClick={() => onReject(order)} disabled={pending.includes(order.id)}>
              <X aria-hidden />
              Tolak
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
