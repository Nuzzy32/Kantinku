import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(file, dependencies = {}) {
  const loaded = { exports: {} }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  runInNewContext(code, { module: loaded, exports: loaded.exports, Intl, Date,
    require: (name) => dependencies[name] ?? require(name) })
  return loaded.exports
}
const tenant = (id, extra = {}) => ({ id, code: `T${id}`, name: `Tenant ${id}`, revenue_share_percent: 10, is_active: true, canteen_id: 1, ...extra })
const now = new Date('2026-10-16T05:00:00Z')
function report({ tenants = [], revenue = [], refunds = [], denied = false, fail } = {}) {
  const calls = []
  let authorized = false
  const db = { from(table) {
    assert.ok(authorized, 'otorisasi wajib sebelum query')
    const call = { table, filters: [] }; calls.push(call)
    const chain = {
      select() { return chain }, order() { return chain },
      eq(column, value) { call.filters.push(['eq', column, value]); return chain },
      gte(column, value) { call.filters.push(['gte', column, value]); return chain },
      lte(column, value) { call.filters.push(['lte', column, value]); return chain },
      not(column, op, value) { call.filters.push(['notnull', column, value]); return chain },
      range(from, to) { call.range = [from, to]; return chain },
      then(ok, reject) {
        const source = table === 'tenants' ? tenants : table === 'tenant_daily_revenue' ? revenue : refunds
        const rows = source.filter((r) => call.filters.every(([op, column, value]) => {
          const actual = column.split('.').reduce((obj, key) => obj?.[key], r)
          return op === 'eq' ? actual === value : op === 'notnull' ? actual != null : op === 'gte' ? actual >= value : actual <= value
        })).slice(call.range[0], call.range[1] + 1)
        return Promise.resolve({ data: rows, error: fail === table ? { message: 'private database detail' } : null }).then(ok, reject)
      },
    }
    return chain
  } }
  return { calls, ...load('lib/admin-report.ts', {
    'server-only': {},
    '@/lib/auth': { requireRole: async (roles, path) => {
      assert.equal(JSON.stringify(roles), '["admin"]'); assert.equal(path, '/admin/login')
      if (denied) throw new Error('redirect to login')
      authorized = true; return { canteen_id: 1 }
    } },
    '@/lib/supabase/server': { createClient: async () => db },
    '@/lib/supabase/read-all': load('lib/supabase/read-all.ts'),
  }) }
}

test('periode default mengikuti tengah malam WIB dan awal bulan', () => {
  for (const [timestamp, today, from] of [
    ['2026-10-15T16:59:59Z', '2026-10-15', '2026-10-01'],
    ['2026-10-15T17:00:00Z', '2026-10-16', '2026-10-01'],
    ['2026-10-31T17:00:00Z', '2026-11-01', '2026-11-01'],
  ]) {
    const value = report().reportPeriod({}, new Date(timestamp))
    assert.equal(value.today, today); assert.equal(value.to, today); assert.equal(value.from, from); assert.equal(value.error, undefined)
  }
})

test('periode menolak tanggal palsu, array, masa depan dan urutan terbalik; leap day sah diterima', () => {
  const { reportPeriod } = report()
  for (const from of ['', '0000-01-01', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', ['2026-10-01']]) {
    const result = reportPeriod({ from }, now)
    assert.match(result.error, /tanggal yang valid/); assert.equal(result.from, '')
  }
  assert.match(reportPeriod({ to: ['2026-10-16'] }, now).error, /tanggal yang valid/)
  assert.match(reportPeriod({ from: '2026-10-16', to: '2026-10-15' }, now).error, /sebelum/)
  assert.match(reportPeriod({ to: '2026-10-17' }, now).error, /hari ini/)
  assert.equal(reportPeriod({ from: '2024-02-29', to: '2024-02-29' }, now).error, undefined)
})

test('laporan inklusif dan terisolasi; bagi hasil menjumlahkan pembulatan harian serta tenant nonaktif', async () => {
  const revenue = (day, gross, canteen, tenantShare, canteenId = 1) => ({ tenant_id: 1, day, gross, canteen_share: canteen, tenant_share: tenantShare, tenant: { canteen_id: canteenId } })
  const refund = (id, canteenId = 1, status = 'needed') => ({ id, subtotal: 5, cancel_reason: null, refund_status: status, status: 'cancelled', paid_at: '2026-10-15T03:00:00Z',
    tenant: { name: 'Tenant 1', code: 'T1', canteen_id: canteenId }, checkout: { customer_name: 'Pembeli' } })
  const h = report({ tenants: [tenant(1, { is_active: false }), tenant(2), tenant(3, { canteen_id: 2 })],
    revenue: [revenue('2026-10-14', 100, 10, 90), revenue('2026-10-15', 5, 1, 4), revenue('2026-10-16', 5, 1, 4),
      revenue('2026-10-17', 100, 10, 90), revenue('2026-10-16', 100, 10, 90, 2)],
    refunds: [refund(42), refund(1042), refund(2042, 2), refund(3042, 1, 'done')],
  })
  const result = await h.getAdminReport({ from: '2026-10-15', to: '2026-10-16' }, now)
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].tenant.is_active, false)
  assert.equal(result.rows[0].gross, 10); assert.equal(result.rows[0].canteen, 2); assert.equal(result.rows[0].tenantShare, 8)
  assert.equal(result.rows[1].gross, 0)
  assert.equal(result.refunds.length, 2)
  assert.equal(result.refunds[0].number, result.refunds[1].number)
  assert.notEqual(result.refunds[0].id, result.refunds[1].id)
  assert.equal(result.refunds[0].reason, 'Pesanan dibatalkan')
  const refundQuery = h.calls.find((c) => c.table === 'orders')
  assert.ok(!refundQuery.filters.some(([, column]) => column === 'day'))
})

test('pagination membaca semua tenant, omzet dan refund melewati 1.000 baris', async () => {
  const tenants = Array.from({ length: 1001 }, (_, i) => tenant(i + 1))
  const h = report({ tenants,
    revenue: tenants.map((t) => ({ tenant_id: t.id, day: '2026-10-16', gross: 5, canteen_share: 1, tenant_share: 4, tenant: { canteen_id: 1 } })),
    refunds: tenants.map((t) => ({ id: t.id, subtotal: 5, refund_status: 'needed', status: 'cancelled', paid_at: '2026-10-15T03:00:00Z', tenant: t, checkout: { customer_name: 'Pembeli' } })),
  })
  const result = await h.getAdminReport({}, now)
  assert.equal(result.rows.length, 1001); assert.equal(result.refunds.length, 1001)
  assert.equal(result.rows.reduce((sum, r) => sum + r.gross, 0), 5005)
  for (const table of ['tenants', 'tenant_daily_revenue', 'orders']) assert.ok(h.calls.some((c) => c.table === table && c.range[0] === 1000))
})

test('periode invalid tidak query omzet; data kosong, otorisasi dan error database tetap jelas', async () => {
  const h = report()
  const result = await h.getAdminReport({ from: 'invalid' }, now)
  assert.ok(result.period.error); assert.equal(result.rows.length, 0); assert.equal(result.refunds.length, 0)
  assert.ok(!h.calls.some((c) => c.table === 'tenant_daily_revenue'))
  const denied = report({ denied: true })
  await assert.rejects(denied.getAdminReport({}, now), /redirect/); assert.equal(denied.calls.length, 0)
  for (const fail of ['tenants', 'tenant_daily_revenue', 'orders']) await assert.rejects(report({ fail }).getAdminReport({}, now), /Data belum bisa dimuat/)
})

function action({ denied = false, data = { id: 42 }, error = null } = {}) {
  const rpc = [], revalidated = []
  let authorized = false
  return { rpc, revalidated, ...load('app/admin/laporan/actions.ts', {
    'next/cache': { revalidatePath: (path) => revalidated.push(path) },
    '@/lib/auth': { requireRole: async (roles, path) => {
      assert.equal(JSON.stringify(roles), '["admin"]'); assert.equal(path, '/admin/login')
      if (denied) throw new Error('redirect to login')
      authorized = true
    } },
    '@/lib/supabase/server': { createClient: async () => {
      assert.ok(authorized)
      return { rpc: async (name, args) => { rpc.push({ name, args }); return { data, error } } }
    } },
  }) }
}

test('aksi refund memvalidasi ID dan otorisasi sebelum memanggil RPC', async () => {
  for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '42', null, undefined]) {
    const h = action(); assert.match((await h.markRefundDone(id)).error, /tidak valid/)
    assert.equal(h.rpc.length, 0); assert.equal(h.revalidated.length, 0)
  }
  const denied = action({ denied: true })
  await assert.rejects(denied.markRefundDone(42), /redirect/); assert.equal(denied.rpc.length, 0)
})

test('aksi refund hanya menyegarkan dashboard dan laporan setelah RPC sukses', async () => {
  const h = action()
  assert.equal((await h.markRefundDone(1042)).error, undefined)
  assert.equal(h.rpc[0].name, 'mark_refund_done'); assert.equal(h.rpc[0].args.p_order_id, 1042)
  assert.deepEqual(h.revalidated, ['/admin', '/admin/laporan'])
  for (const options of [{ data: null }, { error: { message: 'private database detail' } }]) {
    const failure = action(options), result = await failure.markRefundDone(42)
    assert.match(result.error, /Muat ulang/); assert.doesNotMatch(result.error, /private/)
    assert.equal(failure.revalidated.length, 0)
  }
})

function refundClient(markRefundDone) {
  const states = [], pending = [], messages = [], calls = []
  let cursor = 0, saving = false, refreshed = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = initial
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useTransition: () => [saving, (fn) => {
      saving = true
      pending.push(fn().finally(() => { saving = false }))
    }],
  }
  const jsx = (type, props) => ({ type, props })
  const names = (keys) => Object.fromEntries(keys.map((key) => [key, key]))
  const { RefundList } = load('components/admin/refund-list.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/navigation': { useRouter: () => ({ refresh: () => { refreshed++ } }) },
    '@/components/toast': { useToast: () => (message) => messages.push(message) },
    '@/components/pill': names(['Pill']), '@/components/ui/button': names(['Button']),
    '@/components/ui/dialog': names(['Dialog', 'DialogClose', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle']),
    './data-table': names(['RowTh', 'TableWrap', 'Td', 'Th']), '@/lib/rupiah': { rupiah: String },
    '@/app/admin/laporan/actions': { markRefundDone: async (id) => { calls.push(id); return markRefundDone(id) } },
  })
  const refund = { id: 1042, number: 'T1-042', tenantName: 'Tenant 1', customerName: 'Pembeli', amount: 5000, reason: 'Habis', done: false }
  const render = () => { cursor = 0; return RefundList({ refunds: [refund] }) }
  return { states, pending, messages, calls, render, get refreshed() { return refreshed } }
}
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return null
}
const confirmButton = (tree) => findNode(tree, (node) => node.type === 'Button' && ['Ya, sudah direfund', 'Menyimpan…'].includes(node.props.children))
const openRefund = (h) => {
  findNode(h.render(), (node) => node.type === 'Button' && typeof node.props.onClick === 'function').props.onClick()
  return h.render()
}

test('konfirmasi refund memakai ID asli dan hanya selesai setelah server berhasil; pending menolak klik ulang', async () => {
  let finish
  const h = refundClient(() => new Promise((resolve) => { finish = resolve }))
  confirmButton(openRefund(h)).props.onClick()
  assert.deepEqual(h.calls, [1042]); assert.equal(h.refreshed, 0); assert.equal(h.messages.length, 0); assert.equal(h.states[3].size, 0)
  const pendingTree = h.render()
  assert.equal(confirmButton(pendingTree).props.disabled, true)
  confirmButton(pendingTree).props.onClick()
  assert.equal(h.calls.length, 1)
  findNode(pendingTree, (node) => node.type === 'Dialog').props.onOpenChange(false)
  assert.equal(h.states[2], true)
  finish({})
  await Promise.all(h.pending)
  assert.equal(h.states[3].has(1042), true); assert.equal(h.states[2], false)
  assert.equal(h.refreshed, 1); assert.match(h.messages[0], /T1-042.*selesai/)
  assert.ok(findNode(h.render(), (node) => node.type === 'Pill' && node.props.children === 'Selesai'))
})

test('error server atau jaringan mempertahankan dialog dan pesan tanpa menandai refund selesai', async () => {
  for (const handler of [async () => ({ error: 'Refund belum bisa dicatat.' }), async () => { throw new Error('private network detail') }]) {
    const h = refundClient(handler)
    confirmButton(openRefund(h)).props.onClick()
    await Promise.all(h.pending)
    const tree = h.render(), alert = findNode(tree, (node) => node.props.role === 'alert')
    assert.equal(h.states[2], true); assert.equal(h.states[3].size, 0)
    assert.ok(alert); assert.match(alert.props.children, /Refund belum|Periksa koneksi/)
    assert.doesNotMatch(alert.props.children, /private/)
    assert.equal(h.refreshed, 0); assert.equal(h.messages.length, 0)
    assert.equal(confirmButton(tree).props.disabled, false)
  }
})
