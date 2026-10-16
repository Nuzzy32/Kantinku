'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptCash } from '@/app/admin/kasir/actions'
import type { MenuItem, TenantSummary } from '@/lib/types'
import { Tabs } from '@base-ui/react/tabs'
import { useToast } from '@/components/toast'
import { rupiah } from '@/lib/rupiah'
import { CashierCart, type AcceptInput } from './cashier-cart'
import { CashierHistory } from './cashier-history'
import { CashierMenu } from './cashier-menu'
import { MAX_QTY, type CartGroup, type CashSale } from './cashier-types'

const tabClass =
  '-mb-px inline-flex h-14 items-center gap-2 border-b-2 border-transparent px-4 font-semibold text-ink-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:border-primary data-active:text-foreground'

export function Cashier({ tenants, items: menuItems, sales }: { tenants: TenantSummary[]; items: MenuItem[]; sales: CashSale[] }) {
  const toast = useToast()
  const router = useRouter()
  const [cart, setCart] = useState<Record<number, number>>({})
  const [pending, startTransition] = useTransition()
  const submitting = useRef(false)
  const request = useRef<{ payload: string; id: string } | null>(null)
  const [reset, setReset] = useState(0)
  const [error, setError] = useState('')

  const changeQty = (id: number, delta: number) =>
    setCart((prev) => {
      const qty = Math.max(0, Math.min(MAX_QTY, (prev[id] ?? 0) + delta))
      const next = { ...prev }
      if (qty) next[id] = qty
      else delete next[id]
      return next
    })

  const groups: CartGroup[] = tenants.flatMap((tenant) => {
    const lines = menuItems.filter((m) => m.tenantId === tenant.id && cart[m.id]).map((item) => ({ item, qty: cart[item.id] }))
    return lines.length ? [{ tenant, lines, subtotal: lines.reduce((a, l) => a + l.item.price * l.qty, 0) }] : []
  })
  const total = groups.reduce((a, g) => a + g.subtotal, 0)

  const accept = (input: AcceptInput) => {
    if (submitting.current) return
    submitting.current = true
    setError('')
    const items = groups.flatMap((g) => g.lines.map((line) => ({ menu_item_id: line.item.id, quantity: line.qty })))
    const payload = JSON.stringify({ ...input, items })
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() }
    const requestId = request.current.id
    startTransition(async () => {
      try {
        const result = await acceptCash({ ...input, items, requestId })
        if (result.error) { setError(result.error); if (result.status === 409) router.refresh(); return }
        setCart({})
        request.current = null
        setReset((value) => value + 1)
        toast(`Transaksi #${result.checkoutId} · total ${rupiah(result.total!)} · diterima ${rupiah(result.received!)} · kembalian ${rupiah(result.change!)}. Nomor pesanan ada di Riwayat.`)
      } catch {
        setError('Koneksi terputus. Periksa riwayat; mencoba lagi dengan data yang sama tidak menggandakan transaksi.')
      } finally {
        submitting.current = false
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kasir</h1>
        <p className="text-sm text-muted-foreground">Catat pesanan pembeli yang bayar tunai. Pesanan langsung masuk ke tenant.</p>
      </div>

      <Tabs.Root defaultValue="pesanan">
        <Tabs.List aria-label="Bagian kasir" className="flex gap-1 border-b">
          <Tabs.Tab value="pesanan" className={tabClass}>Pesanan baru</Tabs.Tab>
          <Tabs.Tab value="riwayat" className={tabClass}>
            Riwayat
            <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-bold text-ink-2">{sales.length}</span>
          </Tabs.Tab>
        </Tabs.List>

        {/* keepMounted: pencarian, nama, dan uang diterima tidak hilang saat melihat Riwayat. */}
        <Tabs.Panel value="pesanan" keepMounted className="pt-4 outline-none">
          {error && <p role="alert" className="mb-4 text-sm font-semibold text-destructive">{error}</p>}
          <fieldset disabled={pending} className="grid min-w-0 items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
            <CashierMenu tenants={tenants} menuItems={menuItems} cart={cart} onAdd={(id) => changeQty(id, 1)} />
            <CashierCart key={reset} pending={pending} groups={groups} total={total} onQty={changeQty} onAccept={accept} />
          </fieldset>
        </Tabs.Panel>
        <Tabs.Panel value="riwayat" className="pt-4 outline-none">
          <CashierHistory sales={sales} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
