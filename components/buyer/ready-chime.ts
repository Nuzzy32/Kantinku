// Dua nada pendek naik saat pesanan siap. AudioContext baru boleh dibuat dari ketukan pengguna: buat dulu di handler
// "Saya sudah bayar", bunyinya baru dipanggil belasan detik kemudian.
export function chime(ctx: AudioContext | null) {
  if (!ctx || ctx.state === 'closed') return
  if (ctx.state !== 'running') void ctx.resume()
  const t0 = ctx.currentTime
  ;[880, 1175].forEach((freq, i) => {
    const t = t0 + i * 0.18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.17)
  })
}
