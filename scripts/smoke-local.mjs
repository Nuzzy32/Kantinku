// Integrasi database lokal: hanya fixture milik run ini, selalu dibersihkan.
// node --env-file=.env.local scripts/smoke-local.mjs
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createClient } from '@supabase/supabase-js'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, SUPABASE_SECRET_KEY: secret, SEED_PASSWORD: password } = process.env
assert.ok(url && publicKey && secret && password, 'Isi konfigurasi lokal dan SEED_PASSWORD terlebih dahulu.')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname), 'Smoke test hanya diizinkan di Supabase lokal.')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, secret, options)
const fixture = `smoke-${randomUUID().slice(0, 20)}`
const requestIds = [], menuIds = [], signedClients = []
const realtime = { t7: [], t9: [], denied: [] }
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data }
async function login(email) {
  const db = createClient(url, publicKey, options)
  const { user } = ok(await db.auth.signInWithPassword({ email, password }))
  signedClients.push(db)
  const profile = ok(await db.from('profiles').select('id, role, canteen_id, tenant_id').eq('id', user.id).single())
  return { db, profile }
}
function source(session) {
  const cache = new Map()
  const auth = {
    getProfile: async () => session.profile,
    requireRole: async (roles) => { assert.ok(roles.includes(session.profile.role), 'Role forbidden'); return session.profile },
  }
  function load(path) {
    const filename = resolve(path)
    if (cache.has(filename)) return cache.get(filename).exports
    const loaded = { exports: {} }; cache.set(filename, loaded)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    runInNewContext(code, { module: loaded, exports: loaded.exports, Intl, Date, console,
      require: (name) => name === 'server-only' || name === 'next/cache' ? { revalidatePath() {} }
        : name === '@/lib/auth' ? auth
          : name === '@/lib/supabase/admin' ? { supabaseAdmin: admin }
            : name === '@/lib/supabase/server' ? { createClient: async () => session.db }
              : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name),
    }, { filename })
    return loaded.exports
  }
  return load
}
async function subscribe(db, tenantId, events, suffix) {
  const { session } = ok(await db.auth.getSession())
  await db.realtime.setAuth(session.access_token)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Realtime subscription timed out')), 12000)
    let joined = false, registered = false
    const ready = () => { if (joined && registered) { clearTimeout(timer); resolve() } }
    db.channel(`${fixture}-${suffix}`)
      .on('system', {}, (message) => {
        if (message.extension === 'postgres_changes' && message.status === 'ok') { registered = true; ready() }
        if (message.status === 'error') { clearTimeout(timer); reject(new Error('Realtime Postgres registration failed')) }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, (event) => events.push(event))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { joined = true; ready() }
        if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) { clearTimeout(timer); reject(new Error(`Realtime ${status}`)) }
      })
  })
}
async function waitEvent(events, predicate) {
  const until = Date.now() + 10000
  while (!events.some(predicate)) {
    assert.ok(Date.now() < until, 'Realtime order event did not arrive within 10 seconds')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
try {
  const [cashier, owner, t7, t9] = await Promise.all(['kasir', 'admin', 't7', 't9'].map((account) => login(`${account}@kantinku.test`)))
  assert.equal(cashier.profile.canteen_id, owner.profile.canteen_id)
  const tenants = ok(await admin.from('tenants').select('id, is_open, is_active').in('id', [t7.profile.tenant_id, t9.profile.tenant_id]))
  assert.ok(tenants.every((t) => t.is_open && t.is_active), 'Tenant seed T7 dan T9 harus aktif/buka; smoke tidak mengubah status tenant yang ada.')
  const menus = ok(await admin.from('menu_items').insert([
    { tenant_id: t7.profile.tenant_id, name: `${fixture}-mie`, price: 17000 },
    { tenant_id: t9.profile.tenant_id, name: `${fixture}-teh`, price: 4000 },
  ]).select('id, tenant_id'))
  menuIds.push(...menus.map((m) => m.id))
  const loadCashier = source(cashier), loadAdmin = source(owner), load7 = source(t7), load9 = source(t9)
  await Promise.all([subscribe(t7.db, t7.profile.tenant_id, realtime.t7, 't7'), subscribe(t9.db, t9.profile.tenant_id, realtime.t9, 't9'), subscribe(t9.db, t7.profile.tenant_id, realtime.denied, 'denied')])
  const baselineReport = await loadAdmin('lib/admin-report.ts').getAdminReport({})
  const accept = loadCashier('app/admin/kasir/actions.ts').acceptCash
  const requestId = randomUUID(); requestIds.push(requestId)
  const input = { requestId, customerName: fixture, service: 'takeaway', received: 50000, items: menus.map((m) => ({ menu_item_id: m.id, quantity: 1 })) }
  const insufficient = await accept({ ...input, received: 1 })
  assert.equal(insufficient.status, 409)
  assert.equal(ok(await admin.from('checkouts').select('id').eq('cash_request_id', requestId)).length, 0, 'Insufficient cash must roll back the whole checkout')
  const [first, replay] = await Promise.all([accept(input), accept(input)])
  assert.equal(first.error, undefined); assert.equal(first.checkoutId, replay.checkoutId); assert.equal(first.total, 21000)
  const checkout = ok(await admin.from('checkouts').select('id, public_token, payment_status, created_by, total, cash_received').eq('id', first.checkoutId).single())
  assert.equal(checkout.payment_status, 'paid'); assert.equal(checkout.created_by, cashier.profile.id)
  assert.equal(checkout.cash_received - checkout.total, 29000)
  assert.equal(ok(await admin.from('checkouts').select('id').eq('cash_request_id', requestId)).length, 1)
  const mismatch = await accept({ ...input, customerName: `${fixture}-changed` })
  assert.equal(mismatch.status, 409)
  const tenantDenied = await load7('app/admin/kasir/actions.ts').acceptCash(input)
  assert.equal(tenantDenied.status, 403)
  await Promise.all([waitEvent(realtime.t7, (e) => e.new.checkout_id === checkout.id), waitEvent(realtime.t9, (e) => e.new.checkout_id === checkout.id)])
  assert.ok(realtime.t7.every((e) => e.new.tenant_id === t7.profile.tenant_id))
  assert.ok(realtime.t9.every((e) => e.new.tenant_id === t9.profile.tenant_id))
  assert.equal(realtime.denied.length, 0, 'RLS rejects another tenant realtime subscription data')
  const { error: directRpcError } = await t7.db.rpc('create_cash_checkout', { p_canteen_id: owner.profile.canteen_id, p_created_by: cashier.profile.id, p_request_id: randomUUID(), p_customer_name: fixture, p_service_type: 'takeaway', p_items: input.items, p_cash_received: 50000 })
  assert.ok(directRpcError, 'Authenticated tenant cannot directly invoke service-only cash RPC')
  const cashierData = await loadCashier('lib/cashier.ts').getCashier()
  const sale = cashierData.sales.find((s) => s.id === checkout.id)
  assert.equal(sale.received, 50000); assert.equal(sale.parts.length, 2)
  const queue7 = await load7('lib/tenant-orders.ts').getTenantOrders(), queue9 = await load9('lib/tenant-orders.ts').getTenantOrders()
  const order7 = queue7.orders.find((o) => o.customerName === fixture), order9 = queue9.orders.find((o) => o.customerName === fixture)
  assert.ok(order7 && order9); assert.notEqual(order7.id, order9.id)
  assert.equal(order7.subtotal, 17000); assert.equal(order9.subtotal, 4000)
  assert.ok(!queue7.orders.some((o) => o.id === order9.id)); assert.ok(!queue9.orders.some((o) => o.id === order7.id))
  const update7 = load7('app/tenant/(app)/order-actions.ts').updateOrderStatus
  assert.ok((await update7({ id: order9.id, status: 'accepted' })).error, 'Tenant cannot change another tenant order')
  for (const status of ['accepted', 'ready', 'completed']) {
    assert.equal((await update7({ id: order7.id, status })).error, undefined)
    await waitEvent(realtime.t7, (e) => e.new.id === order7.id && e.new.status === status)
  }
  assert.equal((await load9('app/tenant/(app)/order-actions.ts').updateOrderStatus({ id: order9.id, status: 'cancelled', reason: 'Smoke fixture refund' })).error, undefined)
  const report = await loadAdmin('lib/admin-report.ts').getAdminReport({})
  const gross = (value, id) => value.rows.find((r) => r.tenant.id === id).gross
  assert.equal(gross(report, t7.profile.tenant_id) - gross(baselineReport, t7.profile.tenant_id), 17000)
  assert.equal(gross(report, t9.profile.tenant_id), gross(baselineReport, t9.profile.tenant_id))
  assert.ok(report.refunds.some((r) => r.id === order9.id))
  assert.equal((await loadAdmin('app/admin/laporan/actions.ts').markRefundDone(order9.id)).error, undefined)
  assert.ok(!(await loadAdmin('lib/admin-report.ts').getAdminReport({})).refunds.some((r) => r.id === order9.id))
  const publicOrder = await loadAdmin('lib/order.ts').getPublicOrder(checkout.public_token)
  assert.equal(publicOrder.paymentStatus, 'paid'); assert.equal(publicOrder.snapshot.total, 21000)
  assert.equal(publicOrder.statuses[t7.profile.tenant_id], 'completed'); assert.equal(publicOrder.statuses[t9.profile.tenant_id], 'cancelled')
  assert.equal(publicOrder.snapshot.groups.length, 2)
  for (const secretField of ['created_by', 'cash_request_hash', 'cash_received', 'customer_phone']) assert.ok(!JSON.stringify(publicOrder).includes(secretField))
  const onlyRequest = randomUUID(); requestIds.push(onlyRequest)
  const only7 = await accept({ ...input, requestId: onlyRequest, items: [input.items[0]] })
  assert.equal(only7.error, undefined)
  await waitEvent(realtime.t7, (e) => e.new.checkout_id === only7.checkoutId)
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.ok(!realtime.t9.some((e) => e.new.checkout_id === only7.checkoutId), 'T9 receives no T7-only sale')
  assert.equal(realtime.denied.length, 0)
  console.log('PASS: realtime subscribed T7/T9, order inserts/status updates and cross-tenant socket RLS.')
  console.log('PASS: live cash amount/actor/idempotency/rollback, persisted history, tenant isolation/statuses, admin refund/report, public order privacy.')
} finally {
  await Promise.all(signedClients.map((db) => db.removeAllChannels()))
  // Gunakan ID request/menu yang dibuat run ini saja; tidak menyentuh transaksi seed.
  if (requestIds.length) ok(await admin.from('checkouts').delete().in('cash_request_id', requestIds))
  if (menuIds.length) ok(await admin.from('menu_items').delete().in('id', menuIds))
  console.log('Fixture smoke lokal dibersihkan.')
}
