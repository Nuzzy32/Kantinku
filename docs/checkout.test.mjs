// Jalankan kode TypeScript asli dengan batas jaringan/database diganti stub.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const input = () => ({ tableToken: token, customerName: ' Adrian ', customerPhone: '0812 3456 7890', serviceType: 'dine_in', items: [{ menu_item_id: 1, quantity: 2, note: 'Tidak pedas' }] })

function harness(options = {}) {
  const state = { rpc: [], updates: [], requests: [] }
  const env = { XENDIT_SECRET_KEY: 'test-only', ...options.env }
  const expires = new Date(Date.now() + 600_000).toISOString()
  const db = {
    rpc: async (name, args) => {
      state.rpc.push({ name, args })
      return { data: { id: 17, public_token: token, total: 34000 }, error: options.rpcError ?? null }
    },
    from(table) {
      let update
      const chain = {
        select() { return chain },
        eq() { return chain },
        update(value) { update = value; state.updates.push(value); return chain },
        maybeSingle: async () => {
          if (table === 'dining_tables') return { data: options.noTable ? null : { canteen_id: 1 }, error: null }
          if (update) return { data: options.saveError ? null : { id: 17 }, error: options.saveError ? { message: 'private database detail' } : null }
          return { data: options.order ?? {
            public_token: token, payment_status: 'pending', expires_at: expires, qr_string: '000201010212-KANTINKU-TEST', total: 34000,
            customer_phone: 'private-phone', provider_ref: 'private-provider', table: { qr_token: token },
            orders: [{ id: 1042, status: 'pending_payment', subtotal: 34000, cancel_reason: null,
              tenant: { id: 1, code: 'T7', name: 'Warung', is_open: true },
              order_items: [{ id: 1, quantity: 2, name: 'Mie', note: 'Tidak pedas' }] }],
          }, error: null }
        },
        then(ok, fail) { return Promise.resolve({ error: null }).then(ok, fail) },
      }
      return chain
    },
  }
  const modules = new Map()
  const load = (relative) => {
    const filename = resolve(relative)
    if (modules.has(filename)) return modules.get(filename).exports
    const loaded = { exports: {} }
    modules.set(filename, loaded)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    runInNewContext(code, {
      module: loaded, exports: loaded.exports,
      require: (name) => name === 'server-only' ? {} : name === '@/lib/supabase/admin' ? { supabaseAdmin: db }
        : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name),
      process: { env }, Buffer, Request, Response, TextEncoder, AbortSignal, console,
      fetch: async (url, request) => {
        const body = JSON.parse(request.body)
        state.requests.push({ url, ...request, body })
        if (options.networkError) throw new Error('secret upstream details')
        return Response.json({ id: 'qr_test', reference_id: body.reference_id, amount: body.amount, currency: 'IDR', type: 'DYNAMIC', qr_string: '000201010212-KANTINKU-TEST', expires_at: body.expires_at, status: 'ACTIVE', ...options.qr }, { status: options.gatewayStatus ?? 200 })
      },
    }, { filename })
    return loaded.exports
  }
  const post = (body = input(), headers = {}) => load('app/api/checkout/route.ts').POST(new Request('http://localhost/api/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
  return { state, load, post }
}

test('checkout memakai total DB, mengirim QR dinamis 10 menit, dan hanya mengembalikan token', async () => {
  const h = harness()
  const response = await h.post()
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { publicToken: token })
  assert.equal(h.state.rpc[0].name, 'create_checkout')
  assert.equal(h.state.rpc[0].args.p_customer_name, 'Adrian')
  assert.equal(h.state.rpc[0].args.p_customer_phone, '081234567890')
  assert.equal(h.state.rpc[0].args.p_payment_method, 'qris')
  const req = h.state.requests[0]
  assert.equal(req.url, 'https://api.xendit.co/qr_codes')
  assert.equal(req.headers['api-version'], '2022-07-31')
  assert.equal(req.headers.Authorization, `Basic ${Buffer.from('test-only:').toString('base64')}`)
  assert.equal(req.body.amount, 34000)
  assert.equal(req.body.type, 'DYNAMIC')
  assert.ok(Date.parse(req.body.expires_at) > Date.now() + 590_000)
  assert.equal(h.state.updates[0].provider_ref, 'qr_test')
  assert.equal(h.state.updates[0].qr_string, '000201010212-KANTINKU-TEST')
})

test('input palsu, harga browser, tunai anonim, dan body rusak ditolak sebelum DB', async () => {
  for (const value of [
    { ...input(), total: 1 }, { ...input(), payment_method: 'cash' },
    { ...input(), items: [{ menu_item_id: 1, quantity: 0 }] },
    { ...input(), items: [{ menu_item_id: 1, quantity: 1, price: 1 }] },
    { ...input(), customerName: ' ' }, { ...input(), customerPhone: 'abc' },
    { ...input(), tableToken: 'salah' }, { ...input(), items: [] }, '{broken',
  ]) {
    const h = harness()
    assert.equal((await h.post(value)).status, 400)
    assert.equal(h.state.rpc.length, 0)
    assert.equal(h.state.requests.length, 0)
  }
})

test('kunci belum diisi, meja hilang, dan tenant tutup mendapat error yang jelas', async () => {
  const missing = harness({ env: { XENDIT_SECRET_KEY: '' } })
  assert.equal((await missing.post()).status, 503)
  assert.equal(missing.state.rpc.length, 0)
  assert.equal((await harness({ noTable: true }).post()).status, 404)
  const closed = await harness({ rpcError: { code: 'P0001', message: 'Warung sedang tutup. Hapus menunya dari pesanan.' } }).post()
  assert.equal(closed.status, 409)
  assert.match((await closed.json()).error, /Warung sedang tutup/)
})

test('gateway gagal atau respons salah menandai checkout failed tanpa membocorkan error', async () => {
  for (const options of [
    { networkError: true }, { gatewayStatus: 401 }, { qr: { amount: 1 } },
    { qr: { reference_id: 'wrong' } }, { qr: { currency: 'PHP' } },
    { qr: { expires_at: new Date(Date.now() - 1000).toISOString() } },
    { qr: { expires_at: new Date(Date.now() + 86400_000).toISOString() } },
    { saveError: true },
  ]) {
    const h = harness(options)
    const response = await h.post()
    assert.equal(response.status, 502)
    assert.match((await response.json()).error, /Keranjangmu tetap tersimpan/)
    assert.equal(h.state.updates.at(-1).payment_status, 'failed')
  }
})

test('checkout membatasi spam, content type, dan ukuran body', async () => {
  const h = harness()
  assert.equal((await h.post(input(), { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal((await h.post(' '.repeat(33_000))).status, 413)
  for (let i = 0; i < 9; i++) assert.equal((await h.post()).status, 201)
  assert.equal((await h.post()).status, 429)
})

test('status publik merender PNG, menolak token invalid, dan menyembunyikan data privat', async () => {
  const { getPublicOrder } = harness().load('lib/order.ts')
  assert.equal(await getPublicOrder('invalid'), null)
  const order = await getPublicOrder(token)
  assert.match(order.qrImage, /^data:image\/png;base64,iVBOR/)
  assert.equal(order.snapshot.groups[0].number, 'T7-042')
  assert.equal(order.snapshot.groups[0].items[0].note, 'Tidak pedas')
  assert.doesNotMatch(JSON.stringify(order), /private-phone|private-provider|customer_phone|provider_ref/)
})

test('QR yang kedaluwarsa atau lunas tidak ditampilkan lagi', async () => {
  for (const status of ['pending', 'paid', 'failed']) {
    const { getPublicOrder } = harness({ order: { public_token: token, payment_status: status, expires_at: new Date(Date.now() - 1000).toISOString(), qr_string: 'test', total: 1, table: null, orders: [] } }).load('lib/order.ts')
    const order = await getPublicOrder(token)
    assert.equal(order.qrImage, null)
    assert.equal(order.paymentStatus, status === 'pending' ? 'expired' : status)
  }
})
