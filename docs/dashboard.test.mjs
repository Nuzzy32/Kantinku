import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const tenant = (id, extra = {}) => ({ id, code: `T${id}`, name: `Tenant ${id}`, is_open: true, is_active: true, canteen_id: 1, ...extra })
function harness({ tenants = [tenant(1), tenant(2, { is_active: false })], revenue = [], orders = [], fail, denied = false } = {}) {
  const calls = []
  let authorized = false
  const db = { from(table) {
    assert.ok(authorized, 'auth harus diperiksa sebelum query data')
    const call = { table, filters: [] }
    calls.push(call)
    const chain = {
      select(columns, options) { call.columns = columns; call.head = options?.head; call.count = options?.count; return chain },
      eq(column, value) { call.filters.push([column, value]); return chain },
      in(column, values) { call.filters.push([column, values]); return chain },
      order(column) { call.order = column; return chain },
      range(from, to) { call.range = [from, to]; return chain },
      single() { call.single = true; return chain },
      then(ok, reject) {
        let rows = table === 'canteens' ? [{ id: 1, name: 'Kantin Pengelola' }] : table === 'tenants' ? tenants : table === 'tenant_daily_revenue' ? revenue : orders
        rows = rows.filter((r) => call.filters.every(([column, value]) => {
          const actual = column === 'tenant.canteen_id' ? r.canteen_id : r[column]
          return Array.isArray(value) ? value.includes(actual) : actual === value
        }))
        const count = rows.length
        if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1)
        return Promise.resolve({ data: call.head ? null : call.single ? rows[0] : rows, error: fail === table ? { message: 'private DB detail' } : null, count }).then(ok, reject)
      },
    }
    return chain
  } }
  const loaded = { exports: {} }
  const source = ts.transpileModule(readFileSync('lib/admin-dashboard.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  runInNewContext(source, { module: loaded, exports: loaded.exports, Intl, Date, require: (name) => {
    if (name === 'server-only') return {}
    if (name === '@/lib/auth') return { requireRole: async (roles, path) => {
      assert.equal(JSON.stringify(roles), '["admin"]'); assert.equal(path, '/admin/login')
      if (denied) throw new Error('redirect to login')
      authorized = true
      return { canteen_id: 1 }
    } }
    if (name === '@/lib/supabase/server') return { createClient: async () => db }
    return require(name)
  } })
  return { ...loaded.exports, calls }
}

const today = new Date('2026-10-16T05:00:00Z')
test('dashboard menggabungkan omzet DB, tenant nonaktif, dan pekerjaan lintas hari dalam kantin admin', async () => {
  const h = harness({
    tenants: [tenant(1), tenant(2, { is_active: false }), tenant(3), tenant(4, { canteen_id: 2 })],
    revenue: [
      { tenant_id: 1, gross: 30000, order_count: 2, day: '2026-10-16', canteen_id: 1 },
      { tenant_id: 2, gross: 50000, order_count: 1, day: '2026-10-16', canteen_id: 1 },
      { tenant_id: 1, gross: 99999, order_count: 10, day: '2026-10-15', canteen_id: 1 },
      { tenant_id: 4, gross: 99999, order_count: 10, day: '2026-10-16', canteen_id: 2 },
    ],
    orders: [
      { status: 'paid', canteen_id: 1 }, { status: 'accepted', canteen_id: 1 }, { status: 'ready', canteen_id: 1 },
      { status: 'completed', canteen_id: 1 }, { status: 'pending_payment', canteen_id: 1 },
      { status: 'cancelled', refund_status: 'needed', canteen_id: 1, day: '2026-10-15' },
      { status: 'cancelled', refund_status: 'done', canteen_id: 1 },
      { status: 'paid', refund_status: 'needed', canteen_id: 2 },
    ],
  })
  const result = await h.getAdminDashboard(today)
  assert.equal(result.totalGross, 80000)
  assert.equal(result.totalOrders, 3)
  assert.equal(result.totalActive, 3)
  assert.equal(result.refundCount, 1)
  assert.equal(result.rows.length, 3)
  assert.equal(result.rows[0].tenant.id, 2)
  assert.equal(result.rows[0].tenant.is_active, false)
  assert.equal(result.rows[2].gross, 0)
  assert.equal(result.canteenName, 'Kantin Pengelola')
  assert.match(result.dateLabel, /16 Oktober 2026/)
  for (const call of h.calls.filter((c) => c.table === 'orders')) {
    assert.equal(call.head, true)
    assert.equal(call.count, 'exact')
    assert.ok(call.filters.some(([column]) => column === 'tenant.canteen_id'))
    assert.ok(!call.filters.some(([column]) => column === 'day'))
  }
})

test('tanggal berganti pada tengah malam WIB, bukan tengah malam UTC', async () => {
  for (const [time, expected] of [['2026-10-15T16:59:59Z', '2026-10-15'], ['2026-10-15T17:00:00Z', '2026-10-16']]) {
    const h = harness()
    await h.getAdminDashboard(new Date(time))
    assert.ok(h.calls.find((c) => c.table === 'tenant_daily_revenue').filters.some(([column, value]) => column === 'day' && value === expected))
  }
})

test('data kosong memberi nol, dan pagination tidak memotong omzet di 1.000 tenant', async () => {
  const empty = await harness({ tenants: [] }).getAdminDashboard(today)
  assert.equal(empty.totalGross, 0); assert.equal(empty.totalOrders, 0); assert.equal(empty.totalActive, 0); assert.equal(empty.refundCount, 0)
  const tenants = Array.from({ length: 1001 }, (_, i) => tenant(i + 1))
  const revenue = tenants.map((t) => ({ tenant_id: t.id, canteen_id: 1, day: '2026-10-16', gross: 10000, order_count: 1 }))
  const result = await harness({ tenants, revenue }).getAdminDashboard(today)
  assert.equal(result.rows.length, 1001)
  assert.equal(result.totalGross, 10010000)
  assert.equal(result.totalOrders, 1001)
})

test('akses ditolak sebelum query; kegagalan database tidak berubah menjadi angka nol', async () => {
  const denied = harness({ denied: true })
  await assert.rejects(denied.getAdminDashboard(today), /redirect/)
  assert.equal(denied.calls.length, 0)
  for (const fail of ['canteens', 'tenants', 'tenant_daily_revenue', 'orders']) {
    await assert.rejects(harness({ fail }).getAdminDashboard(today), /Dashboard belum bisa dimuat/)
  }
})
