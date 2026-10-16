'use client'

import { Button } from '@/components/ui/button'

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold">Halaman belum bisa dimuat</h1>
      <p className="text-muted-foreground">Periksa koneksi internet, lalu coba lagi.</p>
      <Button onClick={() => retry()}>Coba lagi</Button>
    </main>
  )
}
