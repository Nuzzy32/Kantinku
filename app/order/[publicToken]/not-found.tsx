import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function OrderNotFound() {
  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-bold">Pesanan tidak ditemukan</h1>
      <p className="text-muted-foreground">Periksa tautan pesananmu atau scan ulang QR meja untuk memesan.</p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>Kembali</Link>
    </main>
  )
}
