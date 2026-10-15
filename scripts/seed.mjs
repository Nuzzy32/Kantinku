// Data contoh Story 0: 1 kantin, 3 tenant, 10 menu, 5 meja, 1 admin, 1 kasir, 3 akun tenant.
// Jalankan: SEED_PASSWORD=... npm run seed   (butuh .env.local berisi NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SECRET_KEY)
import { createClient } from '@supabase/supabase-js'

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, SEED_PASSWORD: password } = process.env
if (!url || !key || !password) {
  console.error('Isi NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, dan SEED_PASSWORD (password akun contoh) di .env.local')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data }

const { data: existing } = await db.from('canteens').select('id').eq('slug', 'teknik').maybeSingle()
if (existing) { console.log('Seed sudah pernah dijalankan (kantin "teknik" ada). Tidak ada yang diubah.'); process.exit(0) }

const canteen = ok(await db.from('canteens').insert({ name: 'Kantin Teknik', slug: 'teknik' }).select().single())

ok(await db.from('dining_tables').insert(['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 34'].map((label) => ({ canteen_id: canteen.id, label }))))

const tenants = [
  { code: 'T3', name: 'Dapur Bu Sri', menu: { Nasi: [['Nasi Rames', 15000], ['Nasi Telur Balado', 12000]], Lauk: [['Tempe Mendoan (3)', 6000], ['Ayam Bakar', 14000]] } },
  { code: 'T7', name: 'Mie Mas Joko', menu: { Mie: [['Mie Ayam', 13000], ['Mie Ayam Bakso', 17000]], Bakso: [['Bakso Urat', 16000]], Minuman: [['Es Teh Manis', 4000]] } },
  { code: 'T9', name: 'Segar Jaya', menu: { Jus: [['Jus Alpukat', 12000], ['Jus Jeruk', 10000]] } },
]

const tenantIds = {}
for (const t of tenants) {
  const row = ok(await db.from('tenants').insert({ canteen_id: canteen.id, code: t.code, name: t.name, is_open: true, revenue_share_percent: 10 }).select().single())
  tenantIds[t.code] = row.id
  let sort = 0
  for (const [catName, items] of Object.entries(t.menu)) {
    const cat = ok(await db.from('menu_categories').insert({ tenant_id: row.id, name: catName, sort_order: sort++ }).select().single())
    ok(await db.from('menu_items').insert(items.map(([name, price], i) => ({ tenant_id: row.id, category_id: cat.id, name, price, sort_order: i }))))
  }
}

const accounts = [
  { email: 'admin@kantinku.test', role: 'admin', full_name: 'Bu Ratna' },
  { email: 'kasir@kantinku.test', role: 'cashier', full_name: 'Kasir 1' },
  ...tenants.map((t) => ({ email: `${t.code.toLowerCase()}@kantinku.test`, role: 'tenant', full_name: t.name, tenant_id: tenantIds[t.code] })),
]
for (const { email, ...profile } of accounts) {
  const { user } = ok(await db.auth.admin.createUser({ email, password, email_confirm: true }))
  ok(await db.from('profiles').insert({ id: user.id, canteen_id: canteen.id, ...profile }))
}
console.log(`Seed selesai: kantin "${canteen.name}", 3 tenant, 10 menu, 5 meja, ${accounts.length} akun (email @kantinku.test).`)
