'use client'
import { ArrowUp, ChevronDown, Search } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TableMenu } from '@/lib/menu'
import { cn } from '@/lib/utils'
import { isTenantOpen, useBuyerCart } from './buyer-cart'
import { CartBar } from './cart-bar'
import { CanteenCard, MenuBanner, TableBox } from './menu-header'
import { categoriesOf, categoryId, MenuList } from './menu-list'
import { SearchSheet } from './search-sheet'
import { TenantSheet } from './tenant-sheet'
import { useLiveRefresh } from './use-live-refresh'

// Tinggi baris ringkas yang menempel di atas saat banner sudah tergulir: strip meja 28px (h-7) + baris kantin 48px (h-12).
// Harus sama dengan `top-19` (76px) pada baris tab dan `scroll-mt-32` (76 + tab 48 + 4) pada kategori.
const COMPACT_H = 76
const SPY_LINE = 136 // kategori dianggap aktif bila bagian atasnya sudah melewati garis ini

const scrollBehavior = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

export function MenuScreen({ menu, canteenClosed }: { menu: TableMenu; canteenClosed: boolean }) {
  const { canteen, tableLabel, tenants, items } = menu
  const [activeId, setActiveId] = useState(tenants[0]?.id)
  const [spy, setSpy] = useState<string | null>(null) // kategori yang sedang terlihat saat menggulir
  const [compact, setCompact] = useState(false)
  const [picking, setPicking] = useState(false)
  const [searching, setSearching] = useState(false)
  const { qty, add, dec } = useBuyerCart()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement>(null)
  const scrollToList = useRef(false)
  const spyLocked = useRef(false) // sebentar sesudah klik tab: penanda kategori tidak diubah oleh gulir otomatis
  const spyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const tenant = tenants.find((t) => t.id === activeId) ?? tenants[0]
  const open = tenant ? isTenantOpen(tenant, canteenClosed) : false
  const categories = tenant ? categoriesOf(items, tenant.id) : []
  // spy milik tenant lain (sisa sebelum ganti tenant) tidak cocok, jatuh ke kategori pertama.
  const activeCat = categories.some((c) => c.category === spy) ? spy : categories[0]?.category

  // Next menyimpan state halaman yang ditinggalkan (Activity). Sheet yang terbuka tidak boleh ikut tersimpan.
  useLayoutEffect(() => () => { setSearching(false); setPicking(false) }, [])

  useLiveRefresh()

  // Satu pendengar gulir: baris ringkas (compact) dan kategori aktif. Dirapikan per frame.
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const sentinel = sentinelRef.current
      if (sentinel) setCompact(sentinel.getBoundingClientRect().top <= COMPACT_H)
      if (spyLocked.current) return
      const sections = listRef.current?.querySelectorAll<HTMLElement>('[data-cat]')
      if (!sections?.length) return
      let current = sections[0].dataset.cat ?? null
      sections.forEach((el) => { if (el.getBoundingClientRect().top <= SPY_LINE) current = el.dataset.cat ?? current })
      setSpy(current)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      clearTimeout(spyTimer.current)
      spyLocked.current = false
    }
  }, [])

  // Tab kategori aktif selalu terlihat di baris tab yang bisa digeser.
  useEffect(() => {
    const row = tabsRef.current
    const tab = row?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!row || !tab) return
    const r = row.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    if (t.left < r.left + 8 || t.right > r.right - 8) row.scrollBy({ left: t.left - r.left - 16, behavior: scrollBehavior() })
  }, [activeCat])

  const goCategory = (index: number) => {
    setSpy(categories[index].category)
    spyLocked.current = true
    clearTimeout(spyTimer.current)
    spyTimer.current = setTimeout(() => { spyLocked.current = false }, 800)
    document.getElementById(categoryId(tenant.id, index))?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }

  const pickTenant = (id: number) => {
    setActiveId(id)
    scrollToList.current = true
    setPicking(false)
  }

  return (
    <main className="flex flex-1 flex-col">
      <MenuBanner canteenName={canteen.name} onSearch={() => setSearching(true)} />
      <CanteenCard canteen={canteen} closed={canteenClosed} />
      <TableBox label={tableLabel} />
      <div ref={sentinelRef} aria-hidden />

      {/* Baris ringkas: muncul (dari atas) begitu banner, kartu, dan kotak meja tergulir keluar. Tersembunyi = inert. */}
      <div
        inert={!compact}
        aria-hidden={!compact}
        className={cn(
          'fixed inset-x-0 top-0 z-40 mx-auto max-w-[430px] bg-card transition-transform duration-200',
          compact ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <p className="flex h-7 items-center justify-center bg-accent text-xs font-medium">{tableLabel}</p>
        <div className="flex h-12 items-center justify-between gap-2 pl-4">
          <p className="min-w-0 truncate text-base font-bold">{canteen.name}</p>
          <button
            type="button"
            aria-label="Cari menu"
            aria-haspopup="dialog"
            onClick={() => setSearching(true)}
            className="grid size-11 shrink-0 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Search aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {tenant ? (
        <>
          <div className="sticky top-19 z-20 flex h-12 shrink-0 border-b border-border bg-card">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${tenant.code} ${tenant.name}, pilih tenant`}
              onClick={() => setPicking(true)}
              className="flex max-w-[46%] shrink-0 items-center gap-1 pr-3 pl-4 text-left font-bold text-primary uppercase outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <span aria-hidden className="truncate">{tenant.code} {tenant.name}</span>
              <ChevronDown aria-hidden className="size-4 shrink-0" />
            </button>
            <span aria-hidden className="my-2.5 w-px shrink-0 bg-border" />
            <nav ref={tabsRef} aria-label="Kategori menu" className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
              {categories.map(({ category }, i) => (
                <button
                  key={category}
                  type="button"
                  aria-current={category === activeCat ? 'true' : undefined}
                  onClick={() => goCategory(i)}
                  className="h-full shrink-0 border-b-[3px] border-transparent px-3.5 text-sm font-semibold whitespace-nowrap text-muted-foreground uppercase outline-none transition-colors focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 aria-[current=true]:border-brand-line aria-[current=true]:text-foreground"
                >
                  {category}
                </button>
              ))}
            </nav>
          </div>

          <div ref={listRef} className="scroll-mt-32 pb-4">
            <MenuList tenant={tenant} categories={categories} open={open} qty={qty} onAdd={add} onDec={dec} />
          </div>
        </>
      ) : (
        <p className="px-4 py-12 text-center text-muted-foreground">Belum ada tenant yang berjualan di kantin ini.</p>
      )}

      {/* Zona bawah menempel: tombol naik-ke-atas di atas bar keranjang. Tembus ketuk kecuali anak-anaknya. */}
      <div className="pointer-events-none sticky bottom-0 z-30 mt-auto">
        <div className="relative">
          {compact && (
            <button
              type="button"
              aria-label="Kembali ke atas"
              onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
              className="pointer-events-auto absolute right-4 bottom-full mb-4 grid size-11 place-items-center rounded-full bg-foreground text-primary-foreground shadow-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArrowUp aria-hidden className="size-5" />
            </button>
          )}
          <CartBar />
        </div>
      </div>

      <TenantSheet
        open={picking}
        onOpenChange={setPicking}
        onClosed={() => {
          if (!scrollToList.current) return
          scrollToList.current = false
          listRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
        }}
        tenants={tenants}
        activeId={tenant?.id}
        canteenClosed={canteenClosed}
        onPick={pickTenant}
      />
      <SearchSheet open={searching} onOpenChange={setSearching} tenants={tenants} items={items} canteenClosed={canteenClosed} />
    </main>
  )
}
