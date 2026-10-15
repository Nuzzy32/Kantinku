'use client'
import { useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useToast } from '@/components/toast'
import { menuItems, refunds, tenantOrders, tenants } from '@/lib/mock'
import { rupiah } from '@/lib/rupiah'
import { CashierCart, type AcceptInput } from './cashier-cart'
import { CashierHistory } from './cashier-history'
import { CashierMenu } from './cashier-menu'
import { MAX_QTY, type CartGroup, type CashSale } from './cashier-types'

const tabClass =
  '-mb-px inline-flex h-14 items-center gap-2 border-b-2 border-transparent px-4 font-semibold text-ink-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:border-primary data-active:text-foreground'

// Nomor pesanan berikutnya per tenant = nomor terbesar yang sudah ada + 1 (data contoh dan sesi ini).
const seedNumbers = [...tenantOrders, ...refunds].map((x) => x.number)
function nextNumber(code: string, taken: string[]) {
  const last = Math.max(0, ...taken.filter((n) => n.startsWith(`${code}-`)).map((n) => Number(n.slice(code.length + 1))))
  return `${code}-${String(last + 1).padStart(3, '0')}`
}

const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`

// Pesanan tunai hanya soal tampilan (state lokal). Story 16: panggil create_checkout(payment_method = 'cash').
export function Cashier() {
  const toast = useToast()
  const [cart, setCart] = useState<Record<number, number>>({}) // menu_item_id -> jumlah
  const [sales, setSales] = useState<CashSale[]>([])

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

  const accept = ({ customerName, service, received }: AcceptInput) => {
    const taken = [...seedNumbers, ...sales.flatMap((s) => s.parts.map((p) => p.number))]
    const parts = groups.map((g) => ({
      number: nextNumber(g.tenant.code, taken),
      tenantName: g.tenant.name,
      items: g.lines.map((l) => `${l.qty}× ${l.item.name}`).join(', '),
      subtotal: g.subtotal,
    }))
    setSales((prev) => [{ id: prev.length + 1, time: clock(new Date()), customerName, service, total, received, parts }, ...prev])
    setCart({})
    toast(`Tunai ${rupiah(total)} diterima · masuk ke ${parts.map((p) => p.number).join(', ')}`)
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
          <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
            <CashierMenu cart={cart} onAdd={(id) => changeQty(id, 1)} />
            <CashierCart groups={groups} total={total} onQty={changeQty} onAccept={accept} />
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="riwayat" className="pt-4 outline-none">
          <CashierHistory sales={sales} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
