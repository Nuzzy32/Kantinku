'use client'
import { useRef, useState } from 'react'
import { CircleAlert, Minus, Plus, ShoppingBag, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rupiah } from '@/lib/rupiah'
import type { ServiceType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MAX_QTY, SERVICE_LABEL, type CartGroup } from './cashier-types'

type Tender = 'exact' | number | null // 'exact' = Pas (ikut total), angka = uang yang diterima
const QUICK: Exclude<Tender, null>[] = ['exact', 20000, 50000, 100000]
const SERVICES: { value: ServiceType; icon: typeof Utensils }[] = [
  { value: 'dine_in', icon: Utensils },
  { value: 'takeaway', icon: ShoppingBag },
]

export type AcceptInput = { customerName: string; service: ServiceType; received: number }

export function CashierCart({ groups, total, onQty, onAccept }: {
  groups: CartGroup[]
  total: number
  onQty: (id: number, delta: number) => void
  onAccept: (input: AcceptInput) => void
}) {
  const [name, setName] = useState('')
  const [service, setService] = useState<ServiceType | null>(null)
  const [tender, setTender] = useState<Tender>(null)
  const [errors, setErrors] = useState<{ name?: string; service?: string }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const serviceRef = useRef<HTMLInputElement>(null)

  const received = tender === 'exact' ? total : (tender ?? 0)
  const short = total - received
  const canPay = total > 0 && received >= total

  const accept = () => {
    const customerName = name.trim()
    const next = {
      name: customerName ? undefined : 'Nama pembeli wajib diisi.',
      service: service ? undefined : 'Pilih makan di sini atau bawa pulang.',
    }
    setErrors(next)
    if (next.name) return nameRef.current?.focus()
    if (!service) return serviceRef.current?.focus()
    onAccept({ customerName, service, received })
    setName('')
    setService(null)
    setTender(null)
  }

  return (
    <aside aria-label="Keranjang kasir" className="flex flex-col rounded-lg border bg-card md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:self-start">
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
        <h2 className="text-lg font-bold">Pesanan</h2>

        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Keranjang masih kosong. Ketuk menu di sebelah untuk menambah.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(({ tenant, lines, subtotal }) => (
              <section key={tenant.id} aria-label={`${tenant.code} ${tenant.name}`}>
                <div className="flex items-baseline justify-between gap-2 border-b pb-1 text-sm">
                  <span className="font-bold">{tenant.code} · {tenant.name}</span>
                  <span className="text-muted-foreground">{rupiah(subtotal)}</span>
                </div>
                <ul className="divide-y">
                  {lines.map(({ item, qty }) => (
                    <li key={item.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="leading-tight font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{rupiah(item.price * qty)}</p>
                      </div>
                      <div role="group" aria-label={`Jumlah ${item.name}`} className="flex items-center">
                        <Button variant="outline" size="icon-lg" aria-label={`Kurangi ${item.name}`} onClick={() => onQty(item.id, -1)}>
                          <Minus aria-hidden />
                        </Button>
                        <span className="w-9 text-center text-lg font-bold">{qty}</span>
                        <Button variant="outline" size="icon-lg" aria-label={`Tambah ${item.name}`} disabled={qty >= MAX_QTY} onClick={() => onQty(item.id, 1)}>
                          <Plus aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nama-pembeli">Nama pembeli</Label>
          <Input
            id="nama-pembeli"
            ref={nameRef}
            className="h-14"
            maxLength={40}
            autoComplete="off"
            value={name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby="nama-pembeli-note"
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
          />
          <p id="nama-pembeli-note" className={cn('text-sm', errors.name ? 'font-medium text-destructive' : 'text-xs text-muted-foreground')}>
            {errors.name ?? 'Wajib. Dipanggil saat pesanan siap.'}
          </p>
        </div>

        <fieldset className="flex flex-col gap-1.5" aria-describedby={errors.service ? 'cara-makan-error' : undefined}>
          <legend className="mb-1.5 text-sm font-medium">Cara makan</legend>
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map(({ value, icon: Icon }, i) => (
              <label
                key={value}
                className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card px-2 text-center text-sm font-semibold has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="cara-makan"
                  className="sr-only"
                  ref={i === 0 ? serviceRef : undefined}
                  checked={service === value}
                  onChange={() => { setService(value); setErrors((p) => ({ ...p, service: undefined })) }}
                />
                <Icon className="size-4 shrink-0" aria-hidden />
                {SERVICE_LABEL[value]}
              </label>
            ))}
          </div>
          {errors.service && <p id="cara-makan-error" className="text-sm font-medium text-destructive">{errors.service}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Uang diterima</legend>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="lg"
                className="px-1 text-sm"
                aria-pressed={tender === q}
                disabled={total === 0 || (q !== 'exact' && q < total)}
                onClick={() => setTender(q)}
              >
                {q === 'exact' ? 'Pas' : rupiah(q)}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="uang-diterima" className="text-muted-foreground">Atau ketik jumlahnya</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-muted-foreground" aria-hidden>Rp</span>
              <Input
                id="uang-diterima"
                className="h-14 pl-10 text-lg font-semibold"
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                value={tender === null ? '' : received.toLocaleString('id-ID')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setTender(digits ? Number(digits) : null)
                }}
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-3 border-t p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-extrabold tracking-tight">{rupiah(total)}</span>
        </div>
        <p role="status" className="flex min-h-7 items-center justify-between gap-2">
          {total === 0 ? (
            <span className="text-sm text-muted-foreground">Pilih menu dulu.</span>
          ) : tender === null ? (
            <span className="text-sm text-muted-foreground">Isi uang yang diterima.</span>
          ) : short > 0 ? (
            <span className="flex items-center gap-2 font-bold text-destructive">
              <CircleAlert className="size-5" aria-hidden />
              Uang kurang {rupiah(short)}
            </span>
          ) : (
            <>
              <span className="font-semibold">Kembalian</span>
              <span className="text-xl font-extrabold text-primary">{rupiah(-short)}</span>
            </>
          )}
        </p>
        <Button size="lg" disabled={!canPay} onClick={accept}>
          Terima Tunai {rupiah(total)}
        </Button>
      </div>
    </aside>
  )
}
