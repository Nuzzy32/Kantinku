'use client'
import { TimerOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBuyerCart, useHydrated } from './buyer-cart'
import { menuHref } from './canteen'
import { buildSnapshot, demoSnapshot, type Snapshot } from './order-snapshot'
import { PageHeader } from './page-header'
import { QrisPanel } from './qris-panel'
import { chime } from './ready-chime'
import { StatusView, type DemoStatus } from './status-view'

const PAY_SECONDS = 10 * 60
const rank: Record<DemoStatus, number> = { paid: 0, accepted: 1, ready: 2, cancelled: 3 }

type Phase = 'pay' | 'status' | 'expired'

export function OrderScreen({ rejectDemo }: { rejectDemo: boolean }) {
  const hydrated = useHydrated()
  const { lines, total, clear } = useBuyerCart()
  const [phase, setPhase] = useState<Phase>('pay')
  const [remaining, setRemaining] = useState(PAY_SECONDS)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [statuses, setStatuses] = useState<Record<number, DemoStatus>>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const lastPhase = useRef(phase)

  // Hitung mundur dari jam dinding, bukan dari jumlah tick: tab di latar belakang menunda interval.
  useEffect(() => {
    if (phase !== 'pay') return
    const end = Date.now() + PAY_SECONDS * 1000
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) setPhase('expired')
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // Demo: tenant menerima dan menyiapkan sendiri dengan jeda berbeda. Status asli datang dari Realtime (Story 4-5).
  // Status hanya boleh maju, jadi efek yang jalan dua kali (StrictMode, Activity) tidak memundurkan kartu.
  useEffect(() => {
    if (phase !== 'status' || !snapshot) return
    const advance = (id: number, to: DemoStatus) =>
      setStatuses((s) => (rank[to] > rank[s[id] ?? 'paid'] ? { ...s, [id]: to } : s))
    const last = snapshot.groups.length - 1
    const timers = snapshot.groups.flatMap((g, i) => {
      const id = g.tenant.id
      if (rejectDemo && i === last) return [setTimeout(() => advance(id, 'cancelled'), 9000)]
      return [setTimeout(() => advance(id, 'accepted'), 6000 + i * 3000), setTimeout(() => advance(id, 'ready'), 16000 + i * 6000)]
    })
    return () => timers.forEach(clearTimeout)
  }, [phase, snapshot, rejectDemo])

  // Pesanan siap: getar + bunyi pendek, judul tab berubah selama ada yang siap.
  const readyCount = Object.values(statuses).filter((s) => s === 'ready').length
  const anyReady = readyCount > 0
  const lastReady = useRef(0)
  useEffect(() => {
    if (readyCount > lastReady.current) {
      navigator.vibrate?.([200, 100, 200])
      chime(audioRef.current)
    }
    lastReady.current = readyCount
  }, [readyCount])
  useEffect(() => {
    if (!anyReady) return
    const title = document.title
    document.title = 'Pesanan siap!'
    return () => { if (document.title === 'Pesanan siap!') document.title = title } // jangan timpa judul halaman berikutnya
  }, [anyReady])
  useEffect(() => () => { void audioRef.current?.close(); audioRef.current = null }, [])

  // Pindah fase mengganti seluruh isi layar: bawa fokus ke judul baru agar pembaca layar tahu.
  useEffect(() => {
    if (lastPhase.current === phase) return
    lastPhase.current = phase
    // Kedaluwarsa: fokus ke pesan "Waktu bayar habis" (judul header tetap "Pembayaran").
    rootRef.current?.querySelector<HTMLElement>(phase === 'expired' ? '#order-expired' : 'h1')?.focus()
  }, [phase])

  const paid = () => {
    // Ketukan ini satu-satunya kesempatan membuat AudioContext; bunyinya baru dipakai saat pesanan siap.
    try {
      audioRef.current ??= new AudioContext()
      void audioRef.current.resume()
    } catch {
      // Peramban tanpa WebAudio: tetap ada getar dan judul tab.
    }
    const snap = lines.length ? buildSnapshot(lines) : demoSnapshot
    setSnapshot(snap)
    setStatuses(Object.fromEntries(snap.groups.map((g) => [g.tenant.id, 'paid' as const])))
    clear()
    setPhase('status')
  }

  return (
    <div ref={rootRef} className="flex flex-1 flex-col">
      <PageHeader
        title={phase === 'status' ? 'Status Pesanan' : 'Pembayaran'}
        backHref={phase === 'pay' ? '/checkout' : menuHref}
        backLabel={phase === 'pay' ? 'Kembali ke pesanan' : 'Kembali ke menu'}
      />
      <main className="flex flex-1 flex-col">
        {phase === 'pay' && (
          <QrisPanel
            total={hydrated ? (lines.length ? total : demoSnapshot.total) : null}
            remaining={remaining}
            onPaid={paid}
            onSkip={() => setPhase('expired')}
          />
        )}
        {phase === 'status' && snapshot && <StatusView snapshot={snapshot} statuses={statuses} />}
        {phase === 'expired' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-danger-soft text-destructive">
              <TimerOff aria-hidden className="size-8" />
            </div>
            <h2 id="order-expired" tabIndex={-1} className="text-xl font-bold outline-none">Waktu bayar habis</h2>
            <p className="text-muted-foreground">QRIS ini sudah tidak berlaku. Tidak ada uang yang terpotong, keranjang masih tersimpan.</p>
            <Link href={menuHref} className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl px-8 font-bold')}>Pesan ulang</Link>
          </div>
        )}
      </main>
    </div>
  )
}
