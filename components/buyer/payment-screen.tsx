'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PublicOrder } from '@/lib/order'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from './page-header'
import { QrisPanel } from './qris-panel'
import { StatusView, type DemoStatus } from './status-view'

export function PaymentScreen({ initial }: { initial: PublicOrder }) {
  const [order, setOrder] = useState(initial)
  const [remaining, setRemaining] = useState(600)
  const [message, setMessage] = useState('')
  const [checking, setChecking] = useState(false)
  const inFlight = useRef(false)
  const menuHref = order.menuHref ?? '/'

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((Date.parse(initial.expiresAt ?? '') - Date.now()) / 1000)) || 0)
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [initial.expiresAt])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible' || inFlight.current) return
      inFlight.current = true
      try {
        const response = await fetch(`/api/order/${initial.publicToken}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Status tidak tersedia')
        const next: PublicOrder = await response.json()
        setOrder(next)
        setMessage('')
      } catch {
        if (!controller.signal.aborted) setMessage('Koneksi bermasalah. Status akan diperiksa lagi otomatis.')
      } finally { inFlight.current = false }
    }, 5000)
    return () => { clearInterval(timer); controller.abort() }
  }, [initial.publicToken])

  const check = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setChecking(true)
    try {
      const response = await fetch(`/api/order/${order.publicToken}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Status tidak tersedia')
      const next: PublicOrder = await response.json()
      setOrder(next)
      setMessage(next.paymentStatus === 'paid' ? '' : 'Pembayaran belum terkonfirmasi. Jangan membayar ulang jika saldo sudah terpotong. Hubungi pengelola bila status belum berubah.')
    } catch { setMessage('Status belum bisa diperiksa. Coba lagi sebentar.') }
    finally { inFlight.current = false; setChecking(false) }
  }

  const paid = order.paymentStatus === 'paid'
  const expired = order.paymentStatus === 'expired' || order.paymentStatus === 'pending' && remaining === 0
  const payable = order.paymentStatus === 'pending' && !expired && !!order.qrImage
  const statuses = Object.fromEntries(Object.entries(order.statuses).map(([id, status]) => [id,
    ['paid', 'accepted', 'ready', 'completed', 'cancelled'].includes(status) ? status : 'paid',
  ])) as Record<number, DemoStatus>

  return (
    <>
      <PageHeader title={paid ? 'Status Pesanan' : 'Pembayaran'} backHref={menuHref} backLabel="Kembali ke menu" />
      {message && <p role="status" className="mx-4 mt-4 rounded-xl border border-border bg-accent p-4">{message}</p>}
      {paid ? <StatusView snapshot={order.snapshot} statuses={statuses} isDemo={false} orderMenuHref={menuHref} />
        : payable ? <QrisPanel total={order.snapshot.total} remaining={remaining} qrImage={order.qrImage} onPaid={check} checking={checking} />
        : <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <h2 className="text-xl font-bold">{expired ? 'Waktu bayar habis' : 'QRIS belum tersedia'}</h2>
          <p className="text-muted-foreground">{expired ? 'Jangan bayar QR ini. Jika sudah membayar, hubungi pengelola untuk pengecekan.' : 'Pembayaran belum bisa dilanjutkan. Keranjangmu tetap tersimpan.'}</p>
          <Link href={menuHref} className={buttonVariants({ size: 'lg' })}>Kembali ke menu</Link>
        </main>}
    </>
  )
}
