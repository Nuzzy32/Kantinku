import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, mocks, globals = {}) {
  const loaded = { exports: {} }
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  runInNewContext(code, { module: loaded, exports: loaded.exports, require: (name) => {
    if (name in mocks) return mocks[name]
    if (name.startsWith('@/')) throw new Error(`Unexpected dependency: ${name}`)
    return require(name)
  }, ...globals }, { filename: path })
  return loaded.exports
}

function cartHarness({ blocked = false, full = false } = {}) {
  const storage = new Map()
  const cart = load('lib/cart.ts', { react: {
    useCallback: (fn) => fn,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  } }, { localStorage: {
    getItem(key) { if (blocked) throw new Error('Blocked'); return storage.get(key) ?? null },
    setItem(key, value) { if (blocked || full) throw new Error('Full'); storage.set(key, value) },
    removeItem(key) { if (blocked || full) throw new Error('Full'); storage.delete(key) },
  } })
  return { ...cart, storage }
}

for (const mode of [{}, { blocked: true }, { full: true }]) {
  test(`keranjang tambah, catatan, hapus, dan isolasi meja: ${JSON.stringify(mode)}`, () => {
    const h = cartHarness(mode)
    const key = h.cartKey('teknik', '34')
    const render = () => h.useCart(key)
    render().add(1)
    render().add(1)
    assert.equal(render().cart[1].quantity, 2)
    render().setNote(1, 'x'.repeat(120))
    assert.equal(render().cart[1].note.length, 100)
    assert.equal(Object.keys(h.useCart(h.cartKey('teknik', '35')).cart).length, 0)
    render().dec(1)
    assert.equal(render().cart[1].quantity, 1)
    render().clear()
    assert.equal(Object.keys(render().cart).length, 0)
  })
}

test('keranjang menolak data rusak dan ID menu tidak sah dari storage', () => {
  const h = cartHarness()
  h.storage.set('cart', JSON.stringify({ bad: { quantity: 2 }, '-1': { quantity: 1 }, '1': { quantity: 2, note: 'ok' }, '2': { quantity: 51 } }))
  assert.equal(JSON.stringify(h.useCart('cart').cart), JSON.stringify({ 1: { quantity: 2, note: 'ok' } }))
  h.storage.set('cart', '{broken')
  assert.equal(Object.keys(h.useCart('cart').cart).length, 0)
})

test('menu publik memakai publishable key tanpa membaca cookie sesi staf', async () => {
  const calls = []
  const db = { from(table) {
    const result = { data: table === 'dining_tables' ? { label: 'Meja 34', canteen: { id: 1, name: 'Kantin', slug: 'teknik', open_time: '08:00:00', close_time: '21:00:00' } } : [], error: null }
    const query = { select() { return query }, eq() { return query }, order() { return query }, maybeSingle: async () => result, then: (ok, fail) => Promise.resolve(result).then(ok, fail) }
    return query
  } }
  const pub = load('lib/supabase/public.ts', { 'server-only': {}, '@supabase/supabase-js': { createClient: (...args) => { calls.push(args); return db } } }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test' } } })
  const { getTableMenu } = load('lib/menu.ts', { '@/lib/supabase/public': pub })
  assert.equal(await getTableMenu('invalid'), null)
  assert.equal((await getTableMenu('00000000-0000-4000-8000-000000000034')).tableLabel, 'Meja 34')
  assert.equal(calls[0][1], 'public-test')
  assert.equal(calls[0][2].auth.persistSession, false)
  assert.equal(calls[0][2].auth.autoRefreshToken, false)
  assert.equal(calls[0][2].auth.detectSessionInUrl, false)
})
