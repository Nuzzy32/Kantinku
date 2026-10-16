import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const input = () => ({ requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', customerName: ' Adrian ', service: 'takeaway', received: 50000, items: [{ menu_item_id: 1, quantity: 2 }] })
function harness(options = {}) {
  const calls = [], paths = []
  const profile = options.profile === undefined ? { id: 'cashier-user', role: 'cashier', canteen_id: 7 } : options.profile
  const db = { rpc: async (name, args) => { calls.push({ name, args }); if (options.network) throw new Error('private'); return { data: { id: 94, total: 34000, cash_received: 50000 }, error: options.error ?? null } } }
  const loaded = { exports: {} }
  const source = ts.transpileModule(readFileSync('app/admin/kasir/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  runInNewContext(source, { exports: loaded.exports, module: loaded, require: (name) => name === '@/lib/auth' ? { getProfile: async () => profile } : name === '@/lib/supabase/admin' ? { supabaseAdmin: db } : name === 'next/cache' ? { revalidatePath: (path) => paths.push(path) } : require(name) })
  return { accept: loaded.exports.acceptCash, calls, paths }
}
test('cash accepts authenticated cashier identity and DB total through atomic idempotent RPC', async () => {
  const h = harness(), result = await h.accept(input())
  assert.equal(result.checkoutId, 94); assert.equal(result.total, 34000); assert.equal(result.received, 50000); assert.equal(result.change, 16000)
  assert.equal(h.calls[0].name, 'create_cash_checkout')
  assert.equal(h.calls[0].args.p_created_by, 'cashier-user'); assert.equal(h.calls[0].args.p_canteen_id, 7)
  assert.equal(h.calls[0].args.p_customer_name, 'Adrian'); assert.equal(h.calls[0].args.p_cash_received, 50000)
  assert.equal(h.calls[0].args.p_request_id, input().requestId)
  assert.ok(h.paths.includes('/admin/kasir'))
})
test('anonymous and tenant callers rejected before privileged RPC', async () => {
  for (const profile of [null, { role: 'tenant', canteen_id: 7 }]) {
    const h = harness({ profile }), result = await h.accept(input())
    assert.equal(result.status, 403); assert.equal(h.calls.length, 0)
  }
})
test('invalid quantities, duplicate lines, forged totals/actor and noninteger cash rejected', async () => {
  const original = input()
  for (const bad of [{ ...original, received: 1.5 }, { ...original, total: 1 }, { ...original, created_by: 'other' }, { ...original, items: [original.items[0], original.items[0]] }, { ...original, items: [{ menu_item_id: 1, quantity: 51 }] }, { ...original, requestId: '' }]) {
    const h = harness(), result = await h.accept(bad)
    assert.equal(result.status, 400); assert.equal(h.calls.length, 0)
  }
})
test('stock errors remain actionable without exposing internal SQL details', async () => {
  const h = harness({ error: { code: 'P0001', message: 'Menu habis: Mie' } }), result = await h.accept(input())
  assert.equal(result.status, 409); assert.equal(result.error, 'Menu habis: Mie'); assert.equal(h.paths.length, 0)
  const unknown = await harness({ error: { code: 'P0001', message: 'private SQL details' } }).accept(input())
  assert.doesNotMatch(unknown.error, /private/)
})
test('network uncertainty preserves retry safety without reporting successful payment', async () => {
  const h = harness({ network: true }), result = await h.accept(input())
  assert.equal(result.status, 502); assert.equal(result.checkoutId, undefined); assert.equal(h.paths.length, 0)
})

test('database insufficient tender and reused request errors return conflict', async () => {
  for (const message of ['Uang diterima kurang dari total pesanan. Periksa nominalnya.', 'Permintaan tunai ini sudah digunakan untuk pesanan berbeda.']) {
    const h = harness({ error: { code: 'P0001', message } }), result = await h.accept(input())
    assert.equal(result.status, 409); assert.equal(result.error, message)
  }
})

test('cashier loads only own canteen live menu and persisted last 100 cash receipts', async () => {
  const calls = []
  const sources = {
    tenants: [{ id: 1, canteen_id: 7, is_active: true, code: 'T1', name: 'Warung', is_open: true, revenue_share_percent: 10 }, { id: 2, canteen_id: 8, is_active: true }],
    menu_items: [{ id: 5, tenant_id: 1, name: 'Mie', price: 17000, is_available: true, is_active: true, tenant: { canteen_id: 7, is_active: true }, category: null }],
    checkouts: [{ id: 94, canteen_id: 7, payment_method: 'cash', payment_status: 'paid', created_at: '2026-10-15T18:00:00Z', customer_name: 'Adrian', service_type: 'takeaway', total: 34000, cash_received: 50000, orders: [{ id: 1042, subtotal: 34000, tenant: { code: 'T1', name: 'Warung' }, order_items: [{ quantity: 2, name: 'Mie' }] }] }],
  }
  const db = { from(table) {
    const call = { table, filters: [] }; calls.push(call)
    const chain = {
      select() { return chain }, order() { return chain },
      eq(column, value) { call.filters.push([column, value]); return chain },
      range() { return chain }, limit(value) { call.limit = value; return chain },
      then(resolve, reject) { return Promise.resolve({ data: sources[table].filter((row) => call.filters.every(([column, value]) => column.split('.').reduce((r, key) => r?.[key], row) === value)), error: null }).then(resolve, reject) },
    }; return chain
  } }
  const loaded = { exports: {} }
  const source = ts.transpileModule(readFileSync('lib/cashier.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  runInNewContext(source, { module: loaded, exports: loaded.exports, Intl, Date, require: (name) => name === 'server-only' ? {} : name === '@/lib/auth' ? { requireRole: async (roles) => { assert.equal(JSON.stringify(roles), '["admin","cashier"]'); return { canteen_id: 7 } } } : name === '@/lib/supabase/server' ? { createClient: async () => db } : name === '@/lib/supabase/read-all' ? { readAll: async (query) => (await query(0, 499)).data } : require(name) })
  const value = await loaded.exports.getCashier()
  assert.equal(value.tenants.length, 1); assert.equal(value.items[0].price, 17000)
  assert.equal(value.sales[0].received, 50000); assert.equal(value.sales[0].parts[0].number, 'T1-042')
  assert.equal(calls.find((c) => c.table === 'checkouts').limit, 100)
  for (const call of calls) assert.ok(call.filters.some(([column, value]) => column.endsWith('canteen_id') && value === 7))
})

function cashierClient(handler) {
  const states = [], refs = [], pending = [], calls = [], messages = []
  let cursor = 0, refCursor = 0, saving = false, sequence = 0
  const jsx = (type, props) => ({ type, props })
  const dependencies = {
    react: {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
      useRef(initial) { const i = refCursor++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i] },
      useTransition: () => [saving, (fn) => { saving = true; pending.push(fn().finally(() => { saving = false })) }],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@base-ui/react/tabs': { Tabs: Object.fromEntries(['Root', 'List', 'Tab', 'Panel'].map((s) => [s, s])) },
    '@/components/toast': { useToast: () => (message) => messages.push(message) },
    '@/lib/rupiah': { rupiah: String }, './cashier-cart': { CashierCart: 'CashierCart' }, './cashier-menu': { CashierMenu: 'CashierMenu' }, './cashier-history': { CashierHistory: 'CashierHistory' }, './cashier-types': { MAX_QTY: 50 },
    '@/app/admin/kasir/actions': { acceptCash: async (input) => { calls.push(input); return handler(input) } },
  }
  const loaded = { exports: {} }, source = ts.transpileModule(readFileSync('components/admin/cashier.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  runInNewContext(source, { module: loaded, exports: loaded.exports, crypto: { randomUUID: () => `request-${++sequence}` }, require: (name) => dependencies[name] ?? require(name) })
  function find(node, type) { if (!node || typeof node !== 'object') return null; if (node.type === type) return node; for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, type); if (result) return result } return null }
  const render = () => { cursor = 0; refCursor = 0; return loaded.exports.Cashier({ tenants: [{ id: 1 }], items: [{ id: 1, tenantId: 1, name: 'Mie', price: 17000 }], sales: [] }) }
  return { states, pending, calls, messages, render, find }
}

test('cashier blocks duplicate clicks; failed retry keeps request ID/cart and clears only after success', async () => {
  let finish
  const h = cashierClient(() => new Promise((resolve) => { finish = resolve }))
  h.find(h.render(), 'CashierMenu').props.onAdd(1)
  const accept = h.find(h.render(), 'CashierCart').props.onAccept
  const tender = { customerName: 'Adrian', service: 'takeaway', received: 50000 }
  accept(tender); accept(tender)
  assert.equal(h.calls.length, 1); assert.equal(h.find(h.render(), 'CashierCart').props.pending, true)
  finish({ error: 'Gangguan jaringan' }); await Promise.all(h.pending)
  assert.equal(h.states[0][1], 1); assert.equal(h.messages.length, 0)
  h.find(h.render(), 'CashierCart').props.onAccept(tender)
  assert.equal(h.calls[0].requestId, h.calls[1].requestId)
  finish({ checkoutId: 94, total: 18000, received: 50000, change: 32000 }); await Promise.all(h.pending)
  assert.equal(Object.keys(h.states[0]).length, 0); assert.equal(h.messages.length, 1)
  assert.match(h.messages[0], /total 18000.*diterima 50000.*kembalian 32000/)
})
