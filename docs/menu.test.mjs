import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(file, dependencies, globals = {}) {
  const loaded = { exports: {} }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  runInNewContext(code, { module: loaded, exports: loaded.exports, require: (name) => dependencies[name] ?? require(name), File, FormData, URL, ...globals })
  return loaded.exports
}

function actions(result) {
  const revalidated = []
  const chain = {
    update() { return chain }, eq() { return chain }, select() { return chain },
    maybeSingle: async () => result,
    then(ok, fail) { return Promise.resolve({ data: [{ id: 2, name: 'Makanan', sort_order: 0 }], error: null }).then(ok, fail) },
  }
  return {
    revalidated,
    ...load('app/tenant/(app)/menu/actions.ts', {
      'next/cache': { revalidatePath: (path) => revalidated.push(path) },
      '@/lib/auth': { requireRole: async () => ({ tenant_id: 1 }) },
      '@/lib/supabase/server': { createClient: async () => ({ from: () => chain }) },
      '@/lib/supabase/admin': {},
    }),
  }
}

for (const method of ['setAvailable', 'setActive', 'saveMenuItem']) {
  test(`${method}: nol baris atau error DB tidak dilaporkan berhasil`, async () => {
    const form = new FormData()
    for (const [key, value] of Object.entries({ id: '1', name: 'Nasi', price: '10000', category: 'Makanan' })) form.set(key, value)
    for (const result of [{ data: null, error: null }, { data: null, error: { message: 'private DB detail' } }, { data: { id: 1 }, error: null }]) {
      const h = actions(result)
      const response = await (method === 'saveMenuItem' ? h[method](form) : h[method](1, true))
      assert.equal(!!response.error, !result.data)
      assert.equal(h.revalidated.length, result.data ? 1 : 0)
      assert.doesNotMatch(response.error ?? '', /private DB detail/)
    }
  })
}

function client(file, states = [], globals = {}, overrides = {}) {
  const messages = [], pending = [], updates = []
  let index = 0
  const transition = (action) => pending.push(action())
  const reject = async () => { throw new Error('private network detail') }
  const jsx = (type, props) => ({ type, props })
  const component = new Proxy({}, { get: (_target, name) => name })
  const react = {
    useState: (initial) => {
      const key = index++
      return [key in states ? states[key] : initial, (value) => updates.push([key, value])]
    },
    useTransition: () => [false, transition], startTransition: transition,
    useOptimistic: (initial) => [initial, () => {}],
  }
  const dependencies = new Proxy({
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/toast': { useToast: () => (message, action) => messages.push({ message, action }) },
    '@/app/tenant/(app)/menu/actions': { setAvailable: reject, setActive: reject, saveMenuItem: reject },
    '@/lib/utils': { cn: () => '' }, '@/lib/rupiah': { rupiah: String },
    ...overrides,
  }, { get: (target, name) => target[name] ?? component })
  return { ...load(file, dependencies, globals), messages, updates, pending }
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  const children = [node.props?.children].flat(Infinity)
  for (const child of children) { const found = find(child, predicate); if (found) return found }
  return null
}

test('saklar menu gagal jaringan menampilkan toast tanpa rejected transition', async () => {
  const h = client('components/tenant/menu-manager.tsx')
  const item = { id: 1, name: 'Nasi', category: 'Makanan', price: 10000, isAvailable: true }
  const tree = h.MenuManager({ items: [item], categories: ['Makanan'] })
  const row = find(tree, (node) => typeof node.props?.onToggle === 'function')
  row.props.onToggle(item, false)
  await Promise.all(h.pending)
  assert.match(h.messages[0].message, /Periksa koneksi/)
})

test('gagal menyimpan form tetap menampilkan error dalam dialog', async () => {
  const h = client('components/tenant/menu-form-dialog.tsx', ['Nasi', '10000', 'Makanan'])
  const dialog = h.MenuFormDialog({ open: true, item: null, categories: ['Makanan'], onSaved: () => assert.fail('Tidak boleh sukses'), onOpenChange() {} })
  const formNode = find(dialog, (node) => typeof node.type === 'function')
  const form = formNode.type(formNode.props)
  form.props.onSubmit({ preventDefault() {} })
  await Promise.all(h.pending)
  assert.ok(h.updates.some(([key, value]) => key === 4 && /Periksa koneksi/.test(value)))
})

test('Urungkan yang gagal jaringan menampilkan toast tanpa merusak halaman', async () => {
  const h = client('components/tenant/menu-manager.tsx', [], {}, {
    '@/app/tenant/(app)/menu/actions': {
      setActive: async (_id, active) => { if (active) throw new Error('network'); return {} },
    },
  })
  const item = { id: 1, name: 'Nasi', category: 'Makanan', price: 10000, isAvailable: true }
  const tree = h.MenuManager({ items: [item], categories: ['Makanan'] })
  find(tree, (node) => typeof node.props?.onRemove === 'function').props.onRemove(item)
  await Promise.all(h.pending)
  h.messages[0].action.onClick()
  await Promise.all(h.pending)
  assert.match(h.messages[1].message, /Gagal mengembalikan menu/)
})

test('canvas gagal diproses selalu melepas status foto sibuk', async () => {
  const h = client('components/tenant/menu-form-dialog.tsx', [], {
    createImageBitmap: async () => ({ width: 20, height: 20 }),
    document: { createElement: () => ({ getContext: () => null }) },
  })
  const dialog = h.MenuFormDialog({ open: true, item: null, categories: [], onSaved() {}, onOpenChange() {} })
  const formNode = find(dialog, (node) => typeof node.type === 'function')
  const form = formNode.type(formNode.props)
  const input = find(form, (node) => node.props?.type === 'file')
  await input.props.onChange({ target: { files: [new File(['image'], 'photo.jpg')], value: 'photo.jpg' } })
  assert.deepEqual(h.updates.filter(([key]) => key === 7).map(([, value]) => value), [true, false])
  assert.ok(h.updates.some(([key, value]) => key === 4 && /Foto tidak bisa diproses/.test(value)))
})
