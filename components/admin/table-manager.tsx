'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Plus, Printer } from 'lucide-react'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { diningTables } from '@/lib/mock'
import type { DiningTable } from '@/lib/types'
import { Field } from './field'
import { QrCard } from './qr-card'

const PER_PAGE = 4

// Data contoh di state lokal. Token meja sungguhan = uuid dari database (Story 15).
export function TableManager() {
  const toast = useToast()
  const [tables, setTables] = useState<DiningTable[]>(diningTables)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(diningTables.map((t) => t.qrToken)))
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  const chosen = tables.filter((t) => selected.has(t.qrToken))
  const pages = Array.from({ length: Math.ceil(chosen.length / PER_PAGE) }, (_, i) => chosen.slice(i * PER_PAGE, (i + 1) * PER_PAGE))
  const allSelected = chosen.length === tables.length

  const toggle = (token: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(token)) next.add(token)
      return next
    })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const name = label.trim().replace(/\s+/g, ' ')
    if (!name) return setError('Isi label meja, contoh: Meja 35.')
    if (tables.some((t) => t.label.toLowerCase() === name.toLowerCase())) return setError('Label meja sudah dipakai.')
    const token = `demo-token-${String(tables.length + 1).padStart(2, '0')}`
    setTables((prev) => [...prev, { label: name, qrToken: token }])
    setSelected((prev) => new Set(prev).add(token))
    setLabel('')
    setError('')
    toast(`${name} ditambahkan.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Meja &amp; QR</h1>
        <p className="text-sm text-muted-foreground">Pilih meja yang mau dicetak. Satu halaman A4 memuat {PER_PAGE} kartu.</p>
      </div>

      {/* `print:block` + `print:hidden`: saat dicetak hanya pratinjau yang tampil. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] print:block">
        <section aria-labelledby="daftar-meja" className="flex flex-col gap-4 print:hidden">
          <form onSubmit={add} noValidate className="flex items-start gap-2">
            <div className="flex-1">
              <Field
                label="Tambah meja"
                name="label"
                value={label}
                onChange={(e) => { setLabel(e.target.value); setError('') }}
                error={error}
                maxLength={30}
                autoComplete="off"
                placeholder="Meja 35"
              />
            </div>
            <Button type="submit" className="mt-5">
              <Plus aria-hidden /> Tambah
            </Button>
          </form>

          <div className="flex items-center justify-between gap-2">
            <h2 id="daftar-meja" className="text-lg font-bold">Daftar meja <span className="text-muted-foreground">({tables.length})</span></h2>
            <Button variant="ghost" onClick={() => setSelected(allSelected ? new Set() : new Set(tables.map((t) => t.qrToken)))}>
              {allSelected ? 'Kosongkan pilihan' : 'Pilih semua'}
            </Button>
          </div>
          <ul className="divide-y rounded-lg border bg-card">
            {tables.map((t) => (
              <li key={t.qrToken} className="flex items-center gap-2 pr-2 pl-4">
                <label className="flex min-h-11 flex-1 items-center gap-3 font-semibold">
                  <input type="checkbox" className="size-5 accent-primary" checked={selected.has(t.qrToken)} onChange={() => toggle(t.qrToken)} />
                  {t.label}
                </label>
                <Link
                  href={`/t/${t.qrToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  /t/{t.qrToken}
                  <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(buka di tab baru)</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pratinjau" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 id="pratinjau" className="text-lg font-bold">Pratinjau cetak A4</h2>
              <p className="text-sm text-muted-foreground">
                {chosen.length ? `${chosen.length} meja · ${pages.length} halaman` : 'Belum ada meja dipilih'}
              </p>
            </div>
            <Button onClick={() => window.print()} disabled={!chosen.length}>
              <Printer aria-hidden /> Cetak QR
            </Button>
          </div>

          {/* @page hanya berlaku saat cetak: A4 dengan margin 10mm. */}
          <style>{'@media print { @page { size: A4 portrait; margin: 10mm } }'}</style>
          {chosen.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground print:hidden">
              Centang minimal satu meja di daftar untuk melihat kartunya.
            </p>
          ) : (
            <div className="flex flex-col gap-6 print:gap-0">
              {pages.map((page, i) => (
                <div
                  key={page[0].qrToken}
                  role="group"
                  aria-label={`Halaman ${i + 1} dari ${pages.length}`}
                  className="mx-auto grid aspect-[210/297] w-full max-w-[34rem] grid-cols-2 content-start gap-3 rounded-lg border bg-card p-4 shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:aspect-auto print:w-[190mm] print:max-w-none print:gap-[6mm] print:rounded-none print:border-0 print:p-0 print:shadow-none print:break-after-page print:last:break-after-auto"
                >
                  {page.map((t) => <QrCard key={t.qrToken} table={t} />)}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
