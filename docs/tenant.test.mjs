import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const now = new Date('2026-10-15T17:05:00Z')
const order = (id, tenantId, extra = {}) => ({ id, tenant_id: tenantId, status: 'paid', subtotal: 10000, cancel_reason: null, paid_at: '2026-10-15T17:00:00Z', tenant: { code: `T${tenantId}` }, checkout: { customer_name: 'Pembeli', service_type: 'dine_in', payment_method: 'qris', dining_table: { label: 'Meja 1' } }, items: [{ id: 1, name: 'Nasi', quantity: 1, note: 'Pedas' }], ...extra })
function harness({ tenantId = 1, rows = [], revenue = [], denied = false, fail, rpcError = false } = {}) {
  const calls = [], rpcCalls = []
  let authorized = false
  const db = {
    from(table) {
      assert.ok(authorized, 'cek role sebelum mengambil data')
      const call = { table, filters: [] }; calls.push(call)
      const q = {
        select() { return q },
        eq(k, v) { call.filters.push([k, 'eq', v]); return q },
        in(k, v) { call.filters.push([k, 'in', v]); return q },
        gte(k, v) { call.filters.push([k, 'gte', v]); return q },
        lt(k, v) { call.filters.push([k, 'lt', v]); return q },
        order() { return q },
        range(a, b) { call.range = [a, b]; return q },
        maybeSingle() { call.single = true; return q },
        then(ok, reject) {
          let data = (table === 'orders' ? rows : revenue).filter((r) => call.filters.every(([k, op, v]) => op === 'eq' ? r[k] === v : op === 'in' ? v.includes(r[k]) : op === 'gte' ? r[k] >= v : r[k] < v))
          if (call.range) data = data.slice(call.range[0], call.range[1] + 1)
          return Promise.resolve({ data: call.single ? data[0] ?? null : data, error: fail === table ? { message: 'DB private detail' } : null }).then(ok, reject)
        },
      }
      return q
    },
    async rpc(name, args) { rpcCalls.push({ name, args }); return { error: rpcError ? { message: 'secret detail' } : null } },
  }
  const cache = new Map()
  function load(path) {
    if (cache.has(path)) return cache.get(path)
    const mod = { exports: {} }
    const src = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    runInNewContext(src, { module: mod, exports: mod.exports, Intl, Date, require: (name) => {
      if (name === 'server-only') return {}
      if (name === 'next/cache') return { revalidatePath() {} }
      if (name === '@/lib/auth') return { requireRole: async (roles) => {
        assert.equal(JSON.stringify(roles), '["tenant"]')
        if (denied) throw Error('redirect login')
        authorized = true
        return { tenant_id: tenantId }
      } }
      if (name === '@/lib/supabase/server') return { createClient: async () => db }
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
      return require(name)
    } })
    cache.set(path, mod.exports)
    return mod.exports
  }
  return { ...load('lib/tenant-orders.ts'), ...load('app/tenant/(app)/order-actions.ts'), calls, rpcCalls }
}

test('dua tenant hanya mendapatkan pesanan aktif sendiri, termasuk antrean lintas hari', async () => {
  const rows = [order(1001, 1), order(2, 2), order(3, 1, { status: 'completed' }), order(4, 1, { status: 'pending_payment' }), order(5, 1, { status: 'ready', paid_at: '2026-10-14T12:00:00Z' })]
  for (const tenantId of [1, 2]) {
    const h = harness({ tenantId, rows })
    const result = await h.getTenantOrders(now)
    assert.equal(result.orders.length, tenantId === 1 ? 2 : 1)
    assert.ok(result.orders.every((o) => o.number.startsWith(`T${tenantId}-`)))
    assert.ok(h.calls[0].filters.some(([k, , v]) => k === 'tenant_id' && v === tenantId))
    if (tenantId === 1) { assert.equal(result.orders[0].id, 1001); assert.equal(result.orders[0].number, 'T1-001'); assert.equal(result.orders[0].ageMin, 5); assert.equal(result.orders[0].items[0].note, 'Pedas') }
  }
})

test('rekap memakai tanggal pembayaran WIB dan nominal view, bukan hitung ulang persentase', async () => {
  const h = harness({ rows: [order(1, 1), order(2, 1, { status: 'cancelled' }), order(3, 1, { paid_at: '2026-10-15T16:59:59Z' })], revenue: [{ tenant_id: 1, day: '2026-10-16', gross: 10000, canteen_share: 1501, tenant_share: 8499, order_count: 1 }, { tenant_id: 2, day: '2026-10-16', gross: 99999 }] })
  const recap = await h.getTenantRecap(now)
  assert.equal(recap.day, '2026-10-16'); assert.equal(recap.orders.length, 2)
  assert.equal(recap.gross, 10000); assert.equal(recap.canteenShare, 1501); assert.equal(recap.tenantShare, 8499); assert.equal(recap.orderCount, 1)
  assert.match(recap.dateLabel, /16 Oktober 2026/)
})

test('rekap kosong nol dan pagination tidak memangkas antrean', async () => {
  const empty = await harness().getTenantRecap(now)
  assert.equal(empty.gross, 0); assert.equal(empty.orderCount, 0)
  const h = harness({ rows: Array.from({ length: 1001 }, (_, i) => order(i + 1, 1)) })
  assert.equal((await h.getTenantOrders(now)).orders.length, 1001)
  assert.equal(h.calls.length, 3)
})

test('gagal membaca data tidak disamarkan sebagai antrean kosong; peran ditolak sebelum query', async () => {
  const h = harness({ denied: true })
  await assert.rejects(h.getTenantOrders(now), /redirect/); assert.equal(h.calls.length, 0)
  await assert.rejects(harness({ fail: 'orders' }).getTenantOrders(now), /Data belum/)
  await assert.rejects(harness({ fail: 'tenant_daily_revenue' }).getTenantRecap(now), /Rekap belum/)
})

test('mutasi valid hanya memakai RPC setelah mengecek kepemilikan id asli', async () => {
  const h = harness({ rows: [order(1001, 1)] })
  assert.equal((await h.updateOrderStatus({ id: 1001, status: 'accepted' })).error, undefined)
  assert.equal(h.rpcCalls[0].name, 'set_order_status'); assert.equal(h.rpcCalls[0].args.p_order_id, 1001)
  assert.ok(h.calls[0].filters.some(([k, , v]) => k === 'tenant_id' && v === 1))
  assert.equal((await h.updateOrderStatus({ id: 1001, status: 'cancelled', reason: ' Bahan habis ' })).error, undefined)
  assert.equal(h.rpcCalls[1].args.p_reason, 'Bahan habis')
})

test('status input, alasan kosong/panjang, id tidak valid dan tenant lain ditolak', async () => {
  const h = harness({ rows: [order(1, 2)] })
  for (const input of [{ id: 1, status: 'paid' }, { id: -1, status: 'accepted' }, { id: 1, status: 'cancelled' }, { id: 1, status: 'cancelled', reason: ' ' }, { id: 1, status: 'cancelled', reason: 'x'.repeat(101) }, { id: 1, status: 'accepted' }]) {
    assert.ok((await h.updateOrderStatus(input)).error)
  }
  assert.equal(h.rpcCalls.length, 0)
})

test('gagal RPC mengembalikan pesan Indonesia tanpa detail DB', async () => {
  const h = harness({ rows: [order(1, 1)], rpcError: true })
  const result = await h.updateOrderStatus({ id: 1, status: 'ready' })
  assert.match(result.error, /Gagal mengubah pesanan/); assert.doesNotMatch(result.error, /secret/)
})
