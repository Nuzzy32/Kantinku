'use client'
import { useMemo, useSyncExternalStore } from 'react'
import { refunds as seed } from '@/lib/mock'
import type { Refund } from '@/lib/types'

// Status refund dipakai di 3 tempat (badge menu, kartu dashboard, halaman Laporan).
// Store kecil di memori supaya angkanya ikut berubah saat "Sudah direfund" ditekan, selama halaman tidak di-reload.
// Hilang bersama lib/mock.ts saat Story 18 menyambung ke refund_status di database.
let done: ReadonlySet<string> = new Set(seed.filter((r) => r.done).map((r) => r.number))
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
const snapshot = () => done

export function markRefundDone(number: string) {
  done = new Set(done).add(number)
  listeners.forEach((l) => l())
}

export function useRefunds(): Refund[] {
  const doneNow = useSyncExternalStore(subscribe, snapshot, snapshot)
  return useMemo(() => seed.map((r) => ({ ...r, done: doneNow.has(r.number) })), [doneNow])
}
