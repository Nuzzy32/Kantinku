'use client'
import { Armchair, Check, CircleAlert, Loader2, ShoppingBag, ShoppingBasket, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rupiah } from '@/lib/rupiah'
import type { ServiceType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { groupByTenant, useBuyerCart, useHydrated, useMenuHref, useTableMenu } from './buyer-cart'
import { CheckoutLine } from './checkout-line'
import { PageHeader } from './page-header'

const services: { value: ServiceType; label: string; icon: LucideIcon }[] = [
  { value: 'dine_in', label: 'Makan di sini', icon: Armchair },
  { value: 'takeaway', label: 'Bawa pulang', icon: ShoppingBag },
]

const nameError = (v: string) => (v.trim() ? undefined : 'Nama wajib diisi.')
const waError = (v: string) =>
  !v.trim() || /^(\+62|62|0)8\d{7,12}$/.test(v.replace(/[\s-]/g, '')) ? undefined : 'Nomor WA belum benar. Contoh: 081234567890.'

export function CheckoutScreen() {
  const router = useRouter()
  const hydrated = useHydrated()
  const { lines, total, add, dec, setNote } = useBuyerCart()
  const menu = useTableMenu()
  const menuHref = useMenuHref()
  const [name, setName] = useState('')
  const [wa, setWa] = useState('')
  const [service, setService] = useState<ServiceType>('dine_in')
  const [touched, setTouched] = useState({ name: false, wa: false })
  const [paying, setPaying] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const waRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Next menyimpan state halaman yang ditinggalkan (Activity). Tanpa ini, kembali ke sini sesudah bayar menyisakan tombol "Membuat QRIS…" yang mati.
  useLayoutEffect(() => () => { clearTimeout(timer.current); setPaying(false) }, [])

  const errName = touched.name ? nameError(name) : undefined
  const errWa = touched.wa ? waError(wa) : undefined
  const blocked = lines.some((l) => !l.item.isAvailable || !l.tenant.isOpen)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (paying || blocked) return
    setTouched({ name: true, wa: true })
    if (nameError(name)) return nameRef.current?.focus()
    if (waError(wa)) return waRef.current?.focus()
    setPaying(true)
    // Demo: Story 3 mengirim menu_item_id + quantity + note ke /api/checkout, lalu pindah ke /order/<publicToken>.
    timer.current = setTimeout(() => router.push(`/order/demo?meja=${menu?.qrToken ?? ''}`), 900)
  }

  const header = (
    <PageHeader title="Pesanan Kamu" subtitle={menu ? `${menu.canteen.name} · ${menu.tableLabel}` : undefined} backHref={menuHref} backLabel="Kembali ke menu" />
  )

  if (!hydrated) {
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col gap-3 p-4" role="status">
          <span className="sr-only">Memuat pesanan…</span>
          {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
        </main>
      </>
    )
  }

  if (lines.length === 0) {
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-accent text-brand-line">
            <ShoppingBasket aria-hidden className="size-8" />
          </div>
          <h2 className="text-xl font-bold">Keranjang masih kosong</h2>
          <p className="text-muted-foreground">Pilih menu dari tenant di kantin untuk mulai memesan.</p>
          <Link href={menuHref} className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl px-8 font-bold')}>Pilih menu</Link>
        </main>
      </>
    )
  }

  return (
    <>
      {header}
      <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col gap-5 px-4 py-4">
          {groupByTenant(lines).map(({ tenant, lines: tenantLines }) => (
            <section key={tenant.id} aria-labelledby={`tenant-${tenant.id}`} className="rounded-2xl border border-border bg-card">
              <h2 id={`tenant-${tenant.id}`} className="flex items-center gap-2 border-b border-border px-4 py-3 text-base font-bold">
                {tenant.code} · {tenant.name}
                {!tenant.isOpen && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs leading-none font-bold text-destructive">Tutup</span>}
              </h2>
              <ul className="px-4">
                {tenantLines.map((line) => (
                  <CheckoutLine
                    key={line.item.id}
                    line={line}
                    onAdd={() => add(line.item.id)}
                    onDec={() => dec(line.item.id)}
                    onNote={(note) => setNote(line.item.id, note)}
                  />
                ))}
              </ul>
              <p className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <span className="text-muted-foreground">Subtotal {tenant.name}</span>
                <span className="font-bold">{rupiah(tenantLines.reduce((a, l) => a + l.item.price * l.quantity, 0))}</span>
              </p>
            </section>
          ))}

          <fieldset role="radiogroup">
            <legend className="mb-2 font-bold">Cara makan</legend>
            <div className="grid grid-cols-2 gap-3">
              {services.map(({ value, label, icon: Icon }) => {
                const checked = service === value
                return (
                  <label
                    key={value}
                    className={cn(
                      'relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center font-semibold transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                      checked ? 'border-brand-line bg-accent' : 'border-border bg-card',
                    )}
                  >
                    <input type="radio" name="service" value={value} checked={checked} onChange={() => setService(value)} className="sr-only" />
                    <Icon aria-hidden className="size-6" />
                    {label}
                    {checked && <Check aria-hidden className="absolute top-2 right-2 size-4 text-primary" />}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyer-name">Nama panggilan <span className="font-normal text-muted-foreground">(wajib)</span></Label>
              <Input
                ref={nameRef}
                id="buyer-name"
                value={name}
                maxLength={40}
                autoComplete="given-name"
                enterKeyHint="next"
                aria-invalid={!!errName}
                aria-describedby={errName ? 'buyer-name-error' : 'buyer-name-hint'}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
              {errName
                ? <p id="buyer-name-error" role="alert" className="font-medium text-destructive">{errName}</p>
                : <p id="buyer-name-hint" className="text-muted-foreground">Tenant memanggil pesananmu dengan nama ini.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyer-wa">No. WA <span className="font-normal text-muted-foreground">(opsional)</span></Label>
              <Input
                ref={waRef}
                id="buyer-wa"
                type="tel"
                inputMode="tel"
                value={wa}
                maxLength={20}
                autoComplete="tel"
                aria-invalid={!!errWa}
                aria-describedby={errWa ? 'buyer-wa-error' : undefined}
                onChange={(e) => setWa(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, wa: true }))}
              />
              {errWa && <p id="buyer-wa-error" role="alert" className="font-medium text-destructive">{errWa}</p>}
            </div>
          </div>
        </main>

        <footer className="sticky bottom-0 z-20 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_-2px] shadow-foreground/10">
          {blocked && (
            <p className="mb-3 flex items-start gap-2 font-medium text-destructive">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              Ada menu yang habis atau tenantnya tutup. Hapus dulu dari pesanan untuk lanjut bayar.
            </p>
          )}
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{rupiah(total)}</span>
          </div>
          <Button type="submit" size="lg" className="w-full rounded-xl font-bold" disabled={paying || blocked}>
            {paying ? (<><Loader2 aria-hidden className="animate-spin" />Membuat QRIS…</>) : `Bayar QRIS · ${rupiah(total)}`}
          </Button>
          <p role="status" className="sr-only">{paying ? 'Membuat kode QRIS, mohon tunggu.' : ''}</p>
        </footer>
      </form>
    </>
  )
}
