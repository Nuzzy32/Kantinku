import { useCallback, useEffect, useRef } from 'react'

const BEEP_EVERY_MS = 2400

// Dua nada pendek naik (ding-dong) supaya terdengar di dapur ramai. Amplitudo dinaikkan/diturunkan halus agar tidak "klik".
function beep(ctx: AudioContext) {
  if (ctx.state !== 'running') void ctx.resume()
  const t0 = ctx.currentTime
  ;[880, 1175].forEach((freq, i) => {
    const t = t0 + i * 0.18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.17)
  })
}

// Bip berulang selama `active`. AudioContext baru boleh dibuat dari ketukan pengguna: panggil `enable()` dari handler tombol.
export function useAlarm(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const ctx = ctxRef.current
    if (!active || !ctx) return
    beep(ctx)
    const id = setInterval(() => beep(ctx), BEEP_EVERY_MS)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => () => {
    void ctxRef.current?.close()
    ctxRef.current = null // context tertutup tidak bisa dipakai lagi setelah remount
  }, [])

  return useCallback(() => {
    try {
      ctxRef.current ??= new AudioContext()
      void ctxRef.current.resume()
    } catch {
      // Peramban tanpa WebAudio: layar tetap menampilkan pesanan, hanya tanpa bunyi.
    }
  }, [])
}

// Cegah layar tablet mati selama antrean dipantau. Dilepas peramban saat tab tersembunyi, jadi diminta lagi saat kembali.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release()
          else { void lock?.release(); lock = l }
        })
        .catch(() => {})
    }
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [enabled])
}
