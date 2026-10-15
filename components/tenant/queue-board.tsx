'use client'
import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderStatus, TenantOrder } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CookSummary } from './cook-summary'
import { OrderCard } from './order-card'
import { RejectDialog } from './reject-dialog'
import { StartGate } from './start-gate'
import { useTenant } from './tenant-provider'

const COLUMNS = [
  { status: 'paid', title: 'Baru', empty: 'Belum ada pesanan baru. Tablet berbunyi saat ada yang masuk.' },
  { status: 'accepted', title: 'Dimasak', empty: 'Belum ada yang dimasak. Pesanan yang kamu terima muncul di sini.' },
  { status: 'ready', title: 'Siap', empty: 'Belum ada yang siap diambil.' },
] as const satisfies readonly { status: OrderStatus; title: string; empty: string }[]

function Board() {
  const { orders, newCount, muted, setMuted } = useTenant()
  const [tab, setTab] = useState<OrderStatus>('paid')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNumber, setRejectNumber] = useState('')

  const reject = (order: TenantOrder) => {
    setRejectNumber(order.number)
    setRejectOpen(true)
  }
  // Tertua di atas: yang menunggu paling lama dikerjakan lebih dulu.
  const inColumn = (status: OrderStatus) => orders.filter((o) => o.status === status).sort((a, b) => b.ageMin - a.ageMin)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Antrean</h1>
        <div className="flex items-center gap-3">
          {muted && newCount > 0 && <span className="text-base font-semibold text-warn">Suara mati. Pesanan baru tidak berbunyi.</span>}
          <Button variant="outline" size="lg" className={cn(muted && 'border-warn bg-warn-soft text-warn hover:bg-warn-soft')} onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            {muted ? 'Nyalakan suara' : 'Bisukan suara'}
          </Button>
        </div>
      </div>

      <CookSummary orders={orders} />

      <div role="group" aria-label="Pilih kolom antrean" className="grid grid-cols-3 gap-2 lg:hidden">
        {COLUMNS.map(({ status, title }) => (
          <Button key={status} size="lg" variant={tab === status ? 'default' : 'outline'} aria-pressed={tab === status} onClick={() => setTab(status)}>
            {title}
            <span className="font-extrabold">{inColumn(status).length}</span>
          </Button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {COLUMNS.map(({ status, title, empty }) => {
          const list = inColumn(status)
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              className={cn('flex-col gap-3 rounded-xl bg-muted/60 p-3 lg:flex', tab === status ? 'flex' : 'hidden')}
            >
              <h2 id={`col-${status}`} className="flex items-center gap-2 px-1 text-xl font-bold">
                {title}
                <span
                  className={cn(
                    'min-w-8 rounded-full px-2 text-center text-lg font-extrabold',
                    status === 'paid' && list.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-ink-2',
                  )}
                >
                  {list.length}
                </span>
              </h2>
              {list.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-base text-muted-foreground">{empty}</p>
              ) : (
                list.map((o) => <OrderCard key={o.number} order={o} onReject={reject} />)
              )}
            </section>
          )
        })}
      </div>

      <RejectDialog number={rejectNumber} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  )
}

export function QueueBoard() {
  const { started } = useTenant()
  return started ? <Board /> : <StartGate />
}
