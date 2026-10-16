// Kontrak pembayaran: kod asli dijalankan dengan jaringan dan database stub, tanpa kunci gateway nyata.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherToken = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const payment = (extra = {}) => ({ id: 'py_test', qr_id: 'qr_test', reference_id: token, type: 'DYNAMIC', currency: 'IDR', status: 'SUCCEEDED', amount: 34000, ...extra })
const event = (extra = {}) => ({ event: 'qr.payment', api_version: '2022-07-31', data: payment(), ...extra })

function harness(options = {}) {
  const state = { rpc: [], reads: [], updates: [], requests: [] }
  const env = { XENDIT_WEBHOOK_TOKEN: 'callback-test-only', XENDIT_SECRET_KEY: 'gateway-test-only', ...options.env }
  const checkout = {
    id: 17, total: 34000, payment_method: 'qris', payment_status: 'pending', provider_ref: 'qr_test',
    public_token: token, expires_at: new Date(Date.now() + 600000).toISOString(), qr_string: '000201-TEST',
    customer_name: 'Pembeli', customer_phone: 'PRIVATE_PHONE', created_by: 'PRIVATE_CREATOR', canteen_id: 999,
    table: { qr_token: otherToken }, orders: [{ id: 1042, status: 'paid', subtotal: 34000, cancel_reason: null,
      tenant: { id: 1, code: 'T7', name: 'Warung', is_open: true }, order_items: [{ id: 1, quantity: 2, name: 'Mie', note: null }] }],
    ...options.checkout,
  }
  const db = {
    from(table) {
      const read = { table, filters: [] }; state.reads.push(read)
      let update
      const q = {
        select(columns) { read.columns = columns; return q },
        eq(k, v) { read.filters.push([k, v]); return q },
        is(k, v) { read.filters.push([k, v]); return q },
        update(value) { update = value; state.updates.push(value); return q },
        async maybeSingle() {
          if (options.dbError) return { data: null, error: { message: 'PRIVATE_DB_ERROR' } }
          if (update) {
            if (options.saveError) return { data: null, error: { message: 'PRIVATE_SAVE_ERROR' } }
            Object.assign(checkout, update)
          }
          return { data: options.noCheckout ? null : checkout, error: null }
        },
      }
      return q
    },
    async rpc(name, args) {
      state.rpc.push({ name, args })
      if (!options.rpcError) checkout.payment_status = 'paid'
      return { data: checkout, error: options.rpcError ? { message: 'PRIVATE_RPC_ERROR' } : null }
    },
  }
  const modules = new Map()
  function load(relative) {
    const filename = resolve(relative)
    if (modules.has(filename)) return modules.get(filename).exports
    const mod = { exports: {} }; modules.set(filename, mod)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    runInNewContext(code, {
      module: mod, exports: mod.exports, process: { env }, Buffer, Request, Response, AbortSignal,
      require: (name) => name === 'server-only' ? {} : name === '@/lib/supabase/admin' ? { supabaseAdmin: db } : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name),
      fetch: async (url, request) => {
        state.requests.push({ url, ...request })
        if (options.networkError) throw Error('PRIVATE_GATEWAY_ERROR')
        return Response.json(options.gatewayBody ?? { data: options.payments ?? [payment()], has_more: false }, { status: options.gatewayStatus ?? 200 })
      },
    }, { filename })
    return mod.exports
  }
  const webhook = (body = event(), callback = 'callback-test-only') => load('app/api/webhooks/xendit/route.ts').POST(new Request('http://localhost/api/webhooks/xendit', {
    method: 'POST', headers: callback === null ? {} : { 'x-callback-token': callback }, body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
  const check = (publicToken = token) => load('app/api/order/[publicToken]/check/route.ts').POST(new Request('http://localhost/api/order/check', { method: 'POST' }), { params: Promise.resolve({ publicToken }) })
  return { state, load, webhook, check }
}

test('webhook mewajibkan konfigurasi dan token callback sebelum membaca database', async () => {
  const missing = harness({ env: { XENDIT_WEBHOOK_TOKEN: '' } })
  assert.equal((await missing.webhook()).status, 503)
  for (const value of [null, '', 'wrong', 'callback-test-onlz']) {
    const h = harness(); assert.equal((await h.webhook(event(), value)).status, 401)
    assert.equal(h.state.reads.length, 0); assert.equal(h.state.rpc.length, 0)
  }
})

test('webhook menolak event/version/status/currency/amount yang tidak sah dan body rusak', async () => {
  const invalid = [event({ event: 'payment.capture' }), event({ api_version: '2026-01-01' }),
    ...[{ status: 'COMPLETED' }, { status: 'FAILED' }, { type: 'STATIC' }, { currency: 'USD' }, { amount: 0 }, { amount: -1 }, { amount: 1.5 }, { amount: '34000' }, { amount: Number.MAX_SAFE_INTEGER + 1 }, { reference_id: 'wrong' }].map((p) => event({ data: payment(p) })), '{broken']
  for (const body of invalid) {
    const h = harness(); assert.equal((await h.webhook(body)).status, 400)
    assert.equal(h.state.reads.length, 0); assert.equal(h.state.rpc.length, 0)
  }
  assert.equal((await harness().webhook(' '.repeat(33000))).status, 413)
})

test('webhook memakai referensi dan nominal database; callback berulang aman diteruskan ke RPC idempoten', async () => {
  const h = harness()
  for (let i = 0; i < 2; i++) {
    const response = await h.webhook()
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { received: true })
  }
  assert.equal(h.state.rpc.length, 2)
  for (const rpc of h.state.rpc) { assert.equal(rpc.name, 'mark_checkout_paid'); assert.equal(rpc.args.p_checkout_id, 17); assert.equal(rpc.args.p_amount, 34000) }
  assert.ok(h.state.reads[0].filters.some(([key, value]) => key === 'public_token' && value === token))
  assert.equal(h.state.updates.length, 0)
  assert.equal(h.state.requests.length, 0)
})

test('nominal, metode, provider salah atau checkout hilang tidak menandai lunas', async () => {
  for (const checkout of [{ total: 1 }, { payment_method: 'cash' }, { provider_ref: 'qr_other' }]) {
    const h = harness({ checkout }); const response = await h.webhook()
    assert.equal(response.status, 409); assert.equal(h.state.rpc.length, 0)
  }
  const missing = harness({ noCheckout: true })
  assert.equal((await missing.webhook()).status, 404); assert.equal(missing.state.rpc.length, 0)
})

test('callback awal menyimpan provider secara bersyarat sebelum melunasi dan kegagalan DB menjadi503', async () => {
  const h = harness({ checkout: { provider_ref: null } })
  assert.equal((await h.webhook()).status, 200)
  assert.equal(h.state.updates[0].provider_ref, 'qr_test')
  assert.ok(h.state.reads[1].filters.some(([key, value]) => key === 'provider_ref' && value === null))
  for (const options of [{ dbError: true }, { rpcError: true }, { checkout: { provider_ref: null }, saveError: true }]) {
    const response = await harness(options).webhook()
    assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE/)
  }
})

test('fallback memeriksa endpoint pembayaran dan hanya transaksi sukses yang cocok dapat melunasi', async () => {
  const h = harness({ payments: [payment({ reference_id: otherToken }), payment({ qr_id: 'qr_other' }), payment()] })
  const response = await h.check()
  assert.equal(response.status, 200); assert.equal(h.state.rpc.length, 1)
  const req = h.state.requests[0]
  assert.equal(req.url, 'https://api.xendit.co/qr_codes/qr_test/payments')
  assert.equal(req.headers['api-version'], '2022-07-31'); assert.equal(req.cache, 'no-store')
  assert.equal(req.headers.Authorization, `Basic ${Buffer.from('gateway-test-only:').toString('base64')}`)
  assert.equal((await response.json()).paymentStatus, 'paid')
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
  const wrongAmount = harness({ payments: [payment({ amount: 1 })] })
  assert.equal((await wrongAmount.check()).status, 409); assert.equal(wrongAmount.state.rpc.length, 0)
})

test('status QR COMPLETED tidak cukup; tanpa transaksi SUCCEEDED tidak ada pelunasan', async () => {
  for (const options of [{ payments: [] }, { payments: [payment({ qr_id: 'qr_other' })] }, { gatewayBody: { id: 'qr_test', status: 'COMPLETED' } }, { payments: [payment({ status: 'COMPLETED' })] }]) {
    const h = harness(options); const response = await h.check()
    // Entri bukan SUCCEEDED dilewati (200, tetap belum lunas); hanya respons tanpa daftar data yang gagal (503).
    assert.equal(response.status, options.gatewayBody ? 503 : 200)
    assert.equal(h.state.rpc.length, 0)
  }
})

test('fallback menghindari gateway bagi checkout lunas/tunai/tanpa QR dan menyembunyikan data privat', async () => {
  for (const checkout of [{ payment_status: 'paid' }, { payment_method: 'cash', payment_status: 'paid' }, { provider_ref: null }]) {
    const h = harness({ checkout }); const response = await h.check()
    assert.equal(response.status, 200); assert.equal(h.state.requests.length, 0); assert.equal(h.state.rpc.length, 0)
    assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE|provider_ref|customer_phone|created_by|canteen_id|checkout_id/)
  }
})

test('fallback menangani token invalid/hilang, kunci kosong, error gateway/database dan rate limit', async () => {
  const invalid = harness(); assert.equal((await invalid.check('bad')).status, 404); assert.equal(invalid.state.reads.length, 0)
  assert.equal((await harness({ noCheckout: true }).check()).status, 404)
  for (const options of [{ env: { XENDIT_SECRET_KEY: '' } }, { dbError: true }, { networkError: true }, { gatewayStatus: 401 }, { rpcError: true }]) {
    const response = await harness(options).check(); assert.equal(response.status, 503)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE|gateway-test-only/)
  }
  const limited = harness({ payments: [] })
  assert.equal((await limited.check()).status, 200)
  assert.equal((await limited.check()).status, 429)
  assert.equal(limited.state.requests.length, 1)
})

test('listQrPayments encode id, refuse malformed/provider errors and require key', async () => {
  const h = harness({ payments: [] })
  assert.equal((await h.load('lib/xendit.ts').listQrPayments('qr/test ?')).length, 0)
  assert.equal(h.state.requests[0].url, 'https://api.xendit.co/qr_codes/qr%2Ftest%20%3F/payments')
  for (const options of [{ env: { XENDIT_SECRET_KEY: '' } }, { gatewayStatus: 500 }, { gatewayBody: { id: 'qr_test' } }]) {
    await assert.rejects(harness(options).load('lib/xendit.ts').listQrPayments('qr_test'))
  }
  // Entri yang bentuknya lain dilewati; field pagination yang tidak dipakai tidak wajib.
  assert.deepEqual(await harness({ gatewayBody: { data: [payment({ currency: 'USD' })], has_more: false } }).load('lib/xendit.ts').listQrPayments('qr_test'), [])
  assert.deepEqual(await harness({ gatewayBody: { data: [] } }).load('lib/xendit.ts').listQrPayments('qr_test'), [])
})
