import { menuHref } from '@/components/buyer/canteen'
import Link from 'next/link'

// Halaman awal pengembangan: pintu masuk ke tiap layar. Diganti halaman sungguhan saat produk rilis.
const groups = [
  {
    title: 'Pembeli (HP)',
    links: [
      { href: menuHref, label: 'Menu dari QR meja', note: 'Meja 34' },
      { href: `${menuHref}?tutup=1`, label: 'Menu saat kantin tutup', note: 'contoh keadaan' },
      { href: '/t/salah', label: 'QR tidak dikenal', note: 'Meja tidak ditemukan' },
      { href: '/info', label: 'Info kantin', note: 'Jam operasional' },
      { href: '/profil', label: 'Profil tamu' },
      { href: '/checkout', label: 'Keranjang dan data pembeli' },
      ...(process.env.NODE_ENV === 'production' ? [] : [
        { href: '/order/demo', label: 'Bayar QRIS dan status pesanan', note: 'simulasi development' },
        { href: '/order/demo?demo=tolak', label: 'Status dengan pesanan ditolak', note: 'simulasi development' },
      ]),
    ],
  },
  {
    title: 'Tenant (tablet)',
    links: [
      { href: '/tenant/login', label: 'Masuk tenant' },
      { href: '/tenant', label: 'Antrean pesanan' },
      { href: '/tenant/menu', label: 'Kelola menu' },
      { href: '/tenant/rekap', label: 'Rekap uang masuk' },
    ],
  },
  {
    title: 'Pengelola dan kasir',
    links: [
      { href: '/admin/login', label: 'Masuk pengelola atau kasir' },
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/kasir', label: 'Kasir tunai' },
      { href: '/admin/tenant', label: 'Kelola tenant' },
      { href: '/admin/meja', label: 'Meja dan QR' },
      { href: '/admin/laporan', label: 'Laporan dan refund' },
    ],
  },
]

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">KantinKu</h1>
      <p className="mt-2 text-ink-2">Menu pembeli dan operasional staf memakai data kantin. Pembayaran QRIS memerlukan konfigurasi Xendit pengelola.</p>
      <div className="mt-8 flex flex-col gap-8">
        {groups.map((g, i) => (
          <section key={g.title} aria-labelledby={`grup-${i}`}>
            <h2 id={`grup-${i}`} className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">{g.title}</h2>
            <ul className="flex flex-col gap-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="font-semibold">
                      {l.label}
                      {l.note && <span className="ml-2 text-sm font-normal text-muted-foreground">{l.note}</span>}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">{l.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
