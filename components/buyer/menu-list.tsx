import { Store } from 'lucide-react'
import type { MenuItem, TenantSummary } from '@/lib/types'
import { MenuRow } from './menu-row'

export type CategoryGroup = { category: string; items: MenuItem[] }

// Menu satu tenant dikelompokkan per kategori, urutan kemunculan di data (sudah diurutkan server).
export function categoriesOf(items: MenuItem[], tenantId: number) {
  const groups: CategoryGroup[] = []
  for (const item of items) {
    if (item.tenantId !== tenantId) continue
    const group = groups.find((g) => g.category === item.category)
    if (group) group.items.push(item)
    else groups.push({ category: item.category, items: [item] })
  }
  return groups
}

export const categoryId = (tenantId: number, index: number) => `cat-${tenantId}-${index}`

// Judul grup (nama tenant) + kategori. Tiap kategori punya id dan data-cat untuk tab sticky (gulir ke kategori + penanda aktif).
export function MenuList({ tenant, categories, open, qty, onAdd, onDec }: {
  tenant: TenantSummary
  categories: CategoryGroup[]
  open: boolean
  qty: (id: number) => number
  onAdd: (id: number) => void
  onDec: (id: number) => void
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-5">
        <h2 className="text-base text-muted-foreground uppercase">{tenant.name}</h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      {!open && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-destructive">
          <Store aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-bold">Tutup sekarang.</span> Menu bisa dilihat, tapi belum bisa dipesan.
          </p>
        </div>
      )}
      {categories.length === 0 && <p className="px-4 py-12 text-center text-muted-foreground">Belum ada menu.</p>}
      {categories.map(({ category, items }, i) => {
        const id = categoryId(tenant.id, i)
        return (
          <section key={category} id={id} data-cat={category} aria-labelledby={`${id}-title`} className="scroll-mt-32 last:min-h-[calc(100dvh-8rem)]">
            <h3 id={`${id}-title`} className="px-4 pt-4 pb-1 text-lg font-bold uppercase">{category}</h3>
            <ul>
              {items.map((item) => (
                <MenuRow key={item.id} item={item} tenant={tenant} open={open} quantity={qty(item.id)} onAdd={() => onAdd(item.id)} onDec={() => onDec(item.id)} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
