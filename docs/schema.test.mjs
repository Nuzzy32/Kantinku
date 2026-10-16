// Uji docs/schema.sql di PGlite dengan stub lingkungan Supabase.
// Jalankan: npm i -D @electric-sql/pglite && node docs/schema.test.mjs docs/schema.sql
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

// Dua mode: Supabase baru (tanpa hak default) dan Supabase lama/lokal (anon & authenticated dapat hak penuh otomatis).
const legacy = process.env.LEGACY_GRANTS === '1'

const schema = readFileSync(process.argv[2], 'utf8')
const db = new PGlite()

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create publication supabase_realtime;
  grant usage on schema public, auth to anon, authenticated, service_role;
  -- Mode baru: tanpa default privileges, hanya GRANT eksplisit di schema.sql yang berlaku.
  ${legacy ? `alter default privileges in schema public grant all on tables to anon, authenticated;
             alter default privileges in schema public grant all on functions to anon, authenticated;` : ''}
`)
await db.exec(schema)

const T1 = '11111111-1111-1111-1111-111111111111'
const T2 = '22222222-2222-2222-2222-222222222222'
const ADMIN = '33333333-3333-3333-3333-333333333333'
await db.exec(`
  insert into canteens (name, slug) values ('Kantin GOR', 'gor');
  insert into dining_tables (canteen_id, label, qr_token) values (1, 'Meja 34', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  insert into tenants (canteen_id, code, name, is_open, revenue_share_percent) values
    (1, 'T7', 'Mie Ayam Yamin', true, 10), (1, 'T9', 'Juice', true, 10);
  insert into menu_items (tenant_id, name, price) values
    (1, 'Mie Ayam', 15000), (1, 'Es Teh', 4000), (2, 'Jus Alpukat', 12000);
  insert into menu_items (tenant_id, name, price, is_available) values (2, 'Jus Habis', 10000, false);
  insert into auth.users values ('${T1}'), ('${T2}'), ('${ADMIN}');
  insert into profiles values
    ('${T1}', 'tenant', 1, 1, 'Bu Yamin'), ('${T2}', 'tenant', 1, 2, 'Pak Jus'), ('${ADMIN}', 'admin', 1, null, 'Pengelola');
`)

const asUser = async (uid, fn) => {
  await db.exec(`set request.jwt.claim.sub = '${uid}'; set role authenticated;`)
  try { return await fn() } finally { await db.exec(`reset role; reset request.jwt.claim.sub;`) }
}
const rejects = async (p, re) => assert.rejects(p, re)
const items = JSON.stringify([
  { menu_item_id: 1, quantity: 2, note: 'tidak pedas' },
  { menu_item_id: 2, quantity: 1 },
  { menu_item_id: 3, quantity: 1 },
])
const checkout = (its, method = 'qris') => db.query(
  `select * from create_checkout(1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Adrian', null, 'dine_in', $1, $2::jsonb)`,
  [method, its])

// 1. Checkout multi-tenant: total & subtotal dihitung dari harga DB
const c = (await checkout(items)).rows[0]
assert.equal(Number(c.total), 15000 * 2 + 4000 + 12000)
const ord = (await db.query(`select tenant_id, subtotal, status from orders where checkout_id = $1 order by tenant_id`, [c.id])).rows
assert.deepEqual(ord.map(o => [Number(o.tenant_id), Number(o.subtotal), o.status]),
  [[1, 34000, 'pending_payment'], [2, 12000, 'pending_payment']])

// 2. Tenant belum melihat pesanan yang belum dibayar
assert.equal((await asUser(T1, () => db.query(`select * from orders`))).rows.length, 0)

// 2b. Nominal bayar harus sama dengan total
await rejects(db.query(`select mark_checkout_paid($1, $2)`, [c.id, Number(c.total) - 1]), /Nominal/)

// 3. Setelah lunas, tiap tenant hanya melihat pesanannya sendiri
await db.query(`select mark_checkout_paid($1, $2)`, [c.id, c.total])
const paidAt = (await db.query(`select paid_at from checkouts where id = $1`, [c.id])).rows[0].paid_at
const t1Orders = (await asUser(T1, () => db.query(`select * from orders`))).rows
assert.equal(t1Orders.length, 1); assert.equal(Number(t1Orders[0].subtotal), 34000)
assert.equal((await asUser(T1, () => db.query(`select * from order_items`))).rows.length, 2)
assert.equal((await asUser(T2, () => db.query(`select * from order_items`))).rows.length, 1)
assert.equal((await asUser(T1, () => db.query(`select * from checkouts`))).rows.length, 1)

// 4. Webhook dobel = idempoten
await db.query(`select mark_checkout_paid($1, $2)`, [c.id, c.total])
assert.deepEqual((await db.query(`select paid_at from checkouts where id = $1`, [c.id])).rows[0].paid_at, paidAt)

// 5. Transisi status
const t1Order = Number(t1Orders[0].id)
const t2Order = Number(ord && (await db.query(`select id from orders where tenant_id = 2`)).rows[0].id)
await rejects(asUser(T1, () => db.query(`select set_order_status($1, 'completed')`, [t1Order])), /Tidak bisa mengubah status/)
await rejects(asUser(T1, () => db.query(`select set_order_status($1, 'accepted')`, [t2Order])), /tidak ditemukan/)
await asUser(T1, () => db.query(`select set_order_status($1, 'accepted')`, [t1Order]))
await asUser(T1, () => db.query(`select set_order_status($1, 'ready')`, [t1Order]))
await asUser(T1, () => db.query(`select set_order_status($1, 'completed')`, [t1Order]))
await rejects(asUser(T2, () => db.query(`select set_order_status($1, 'cancelled')`, [t2Order])), /Alasan/)
await asUser(T2, () => db.query(`select set_order_status($1, 'cancelled', 'Alpukat habis')`, [t2Order]))
assert.equal((await db.query(`select refund_status from orders where id = $1`, [t2Order])).rows[0].refund_status, 'needed')

// 6. Tenant tidak bisa update langsung tabel orders
await rejects(asUser(T1, () => db.query(`update orders set subtotal = 1`)), /permission denied/)
assert.equal(Number((await db.query(`select subtotal from orders where id = $1`, [t1Order])).rows[0].subtotal), 34000)

// 7. Tenant: hanya boleh ubah is_open miliknya; admin bebas
await asUser(T1, () => db.query(`update tenants set is_open = false where id = 1`))
await rejects(asUser(T1, () => db.query(`update tenants set revenue_share_percent = 0 where id = 1`)), /hanya boleh/)
await asUser(T1, () => db.query(`update tenants set is_open = false where id = 2`))
assert.equal((await db.query(`select is_open from tenants where id = 2`)).rows[0].is_open, true)
await asUser(ADMIN, () => db.query(`update tenants set name = 'Mie Ayam Yamin 2' where id = 1`))
assert.equal((await db.query(`select name from tenants where id = 1`)).rows[0].name, 'Mie Ayam Yamin 2')

// 7a. Admin hanya mengelola kantinnya sendiri (Story 14), dan tidak bisa menulis profiles langsung
await db.exec(`insert into canteens (name, slug) values ('Kantin Lain', 'lain');
               insert into tenants (canteen_id, code, name) values (2, 'X1', 'Tenant Kantin Lain');`)
assert.equal((await asUser(ADMIN, () => db.query(`update tenants set name = 'Dibajak' where code = 'X1' returning id`))).rows.length, 0)
await rejects(asUser(ADMIN, () => db.query(`insert into tenants (canteen_id, code, name) values (2, 'X2', 'Sisipan')`)), /row-level security/)
await asUser(ADMIN, () => db.query(`insert into tenants (canteen_id, code, name) values (1, 'T11', 'Tenant Baru')`))
await rejects(asUser(ADMIN, () => db.query(`insert into tenants (canteen_id, code, name) values (1, 'T11', 'Kode Ganda')`)), /duplicate key/)
await rejects(asUser(ADMIN, () => db.query(`insert into profiles values ('${T1}', 'admin', 1, null, 'Naik pangkat')`)), /permission denied/)
await db.exec(`delete from tenants where code in ('X1', 'T11'); delete from canteens where slug = 'lain';`)

// 7b. Tenant tidak bisa menaruh menunya di kategori tenant lain
await db.exec(`insert into menu_categories (tenant_id, name) values (2, 'Jus')`)
await rejects(asUser(T1, () => db.query(`update menu_items set category_id = 1 where id = 1`)), /foreign key/)

// 8. Validasi checkout: tenant tutup, menu habis, keranjang kosong, qty aneh
await rejects(checkout(JSON.stringify([{ menu_item_id: 1, quantity: 1 }])), /Mie Ayam Yamin 2 sedang tutup/) // tenant 1 ditutup di tes 7
await rejects(checkout(JSON.stringify([{ menu_item_id: 4, quantity: 1 }])), /Menu habis: Jus Habis/)
await rejects(checkout(JSON.stringify([{ menu_item_id: 3, quantity: 0 }])), /Jumlah tidak valid/)
await rejects(checkout(JSON.stringify([{ menu_item_id: 3 }])), /Jumlah tidak valid/)
await rejects(checkout(JSON.stringify([{ menu_item_id: 999, quantity: 1 }])), /tidak tersedia: #999/)
await rejects(checkout('[]'), /Keranjang kosong/)

// 9. Fungsi server-only tidak bisa dipanggil dari browser
await db.exec(`set role anon`)
await rejects(checkout(JSON.stringify([{ menu_item_id: 3, quantity: 1 }])), /permission denied/)
await rejects(db.query(`select mark_checkout_paid(1, 1)`), /permission denied/)
await rejects(db.query(`select * from orders`), /permission denied/)
await rejects(db.query(`select * from checkouts`), /permission denied/)
assert.equal((await db.query(`select * from menu_items`)).rows.length, 4) // menu publik
await rejects(db.query(`select revenue_share_percent from tenants`), /permission denied/) // bagi hasil bukan data publik
assert.equal((await db.query(`select id, name, is_open from tenants`)).rows.length, 2)
await db.exec(`reset role`)

// 10. Tunai langsung lunas; QRIS kedaluwarsa
const cash = (await checkout(JSON.stringify([{ menu_item_id: 3, quantity: 1 }]), 'cash')).rows[0]
assert.equal(cash.payment_status, 'paid')
const q = (await checkout(JSON.stringify([{ menu_item_id: 3, quantity: 1 }]))).rows[0]
await db.query(`update checkouts set expires_at = now() - interval '1 minute' where id = $1`, [q.id])
await db.query(`select expire_checkouts()`)
assert.equal((await db.query(`select status from orders where checkout_id = $1`, [q.id])).rows[0].status, 'expired')
// QR tidak pernah tersimpan (expires_at kosong): kedaluwarsa 15 menit setelah dibuat, bukan pending selamanya
const noQr = (await checkout(JSON.stringify([{ menu_item_id: 3, quantity: 1 }]))).rows[0]
await db.query(`select expire_checkouts()`)
assert.equal((await db.query(`select payment_status from checkouts where id = $1`, [noQr.id])).rows[0].payment_status, 'pending') // masih baru
await db.query(`update checkouts set created_at = now() - interval '16 minutes' where id = $1`, [noQr.id])
await db.query(`select expire_checkouts()`)
assert.equal((await db.query(`select payment_status from checkouts where id = $1`, [noQr.id])).rows[0].payment_status, 'expired')
// Pesanan kedaluwarsa tidak terlihat tenant dan tidak bisa diubah statusnya
const qOrder = Number((await db.query(`select id from orders where checkout_id = $1`, [q.id])).rows[0].id)
assert.equal((await asUser(T2, () => db.query(`select * from orders where id = $1`, [qOrder]))).rows.length, 0)
assert.equal((await asUser(T2, () => db.query(`select * from order_items where order_id = $1`, [qOrder]))).rows.length, 0)
await rejects(asUser(T2, () => db.query(`select set_order_status($1, 'accepted')`, [qOrder])), /Tidak bisa mengubah status/)
// Bayar telat (webhook terlambat) tetap dicatat: pesanan hidup lagi dan masuk ke tenant
const late = (await checkout(JSON.stringify([{ menu_item_id: 3, quantity: 1 }]))).rows[0]
await db.query(`update checkouts set expires_at = now() - interval '1 minute' where id = $1`, [late.id])
assert.equal((await db.query(`select expire_checkouts() as n`)).rows[0].n, 1) // jumlah checkout, bukan order
await db.query(`select mark_checkout_paid($1, $2)`, [late.id, late.total])
assert.equal((await db.query(`select status from orders where checkout_id = $1`, [late.id])).rows[0].status, 'paid')

// 11. Laporan: tenant hanya lihat omzetnya; pesanan batal tidak dihitung
const rev = (await asUser(T2, () => db.query(`select * from tenant_daily_revenue`))).rows
assert.equal(rev.length, 1); assert.equal(Number(rev[0].gross), 24000) // pesanan tunai + bayar telat
assert.equal(Number(rev[0].canteen_share), 2400)
const revT1 = (await asUser(T1, () => db.query(`select * from tenant_daily_revenue`))).rows
assert.equal(Number(revT1[0].gross), 34000)
assert.equal((await asUser(ADMIN, () => db.query(`select * from tenant_daily_revenue`))).rows.length, 2)

// 12. Hak akses eksplisit: fungsi server-only & tabel transaksi tertutup untuk user login; service_role bisa
const one = JSON.stringify([{ menu_item_id: 3, quantity: 1 }])
await rejects(asUser(T1, () => checkout(one)), /permission denied/)
await rejects(asUser(T1, () => db.query(`select mark_checkout_paid(1, 1)`)), /permission denied/)
await rejects(asUser(T1, () => db.query(`insert into orders (checkout_id, tenant_id, subtotal) values (1, 1, 1)`)), /permission denied/)
await db.exec(`set role service_role`)
const sr = (await checkout(one)).rows[0]
await db.query(`update checkouts set provider_ref = 'qr_1', qr_string = '000201', expires_at = now() + interval '10 minutes' where id = $1`, [sr.id])
await db.query(`select mark_checkout_paid($1, $2)`, [sr.id, sr.total])
assert.equal((await db.query(`select payment_status from checkouts where id = $1`, [sr.id])).rows[0].payment_status, 'paid')
await db.query(`update tenants set is_open = true where id = 1`) // server boleh ubah tenant (trigger guard tidak menolak)
await db.exec(`reset role`)

// 13. Dashboard pengelola: hari mengikuti waktu bayar WIB, aktivitas/refund lintas hari,
// tenant nonaktif tetap dihitung, dan transaksi kantin lain tidak ikut terbaca.
await db.exec('begin')
try {
  const dashboardAdmin = '44444444-4444-4444-4444-444444444444'
  const dashboardCanteens = (await db.query(`
    insert into canteens (name, slug) values
      ('Dashboard A', 'dashboard-a'), ('Dashboard B', 'dashboard-b') returning id
  `)).rows
  const dashboardTenants = (await db.query(`
    insert into tenants (canteen_id, code, name, is_active) values
      ($1, 'DA', 'Tenant nonaktif', false), ($2, 'DB', 'Tenant kantin lain', true) returning id
  `, dashboardCanteens.map((row) => row.id))).rows
  await db.query(`insert into auth.users values ($1)`, [dashboardAdmin])
  await db.query(`insert into profiles values ($1, 'admin', $2, null, 'Admin dashboard')`,
    [dashboardAdmin, dashboardCanteens[0].id])

  const fixtureOrders = [
    [0, 'paid', 1000, '2026-10-15T16:59:59Z', 'none'],
    [0, 'completed', 2000, '2026-10-15T17:00:00Z', 'none'],
    [0, 'accepted', 3000, '2026-10-14T17:00:00Z', 'none'],
    [0, 'cancelled', 4000, '2026-10-14T17:00:00Z', 'needed'],
    [0, 'cancelled', 5000, '2026-10-15T17:00:00Z', 'needed'],
    [0, 'pending_payment', 6000, null, 'none'],
    [0, 'expired', 7000, null, 'none'],
    [0, 'cancelled', 8000, '2026-10-15T17:00:00Z', 'done'],
    [1, 'ready', 9000, '2026-10-15T17:00:00Z', 'none'],
    [1, 'cancelled', 10000, '2026-10-14T17:00:00Z', 'needed'],
  ]
  for (const [canteen, status, subtotal, paidAt, refundStatus] of fixtureOrders) {
    const fixtureCheckout = (await db.query(`
      insert into checkouts (canteen_id, customer_name, service_type, payment_method, payment_status, total, paid_at)
      values ($1, 'Pembeli dashboard', 'takeaway', 'qris', $2, $3, $4) returning id
    `, [dashboardCanteens[canteen].id, paidAt ? 'paid' : status === 'expired' ? 'expired' : 'pending', subtotal, paidAt])).rows[0]
    await db.query(`
      insert into orders (checkout_id, tenant_id, status, subtotal, paid_at, refund_status)
      values ($1, $2, $3, $4, $5, $6)
    `, [fixtureCheckout.id, dashboardTenants[canteen].id, status, subtotal, paidAt, refundStatus])
  }

  const dashboardRevenue = (await asUser(dashboardAdmin, () => db.query(`
    select tenant_id, day::text, order_count, gross from tenant_daily_revenue order by day
  `))).rows
  assert.deepEqual(dashboardRevenue.map((row) => [Number(row.tenant_id), row.day, Number(row.order_count), Number(row.gross)]), [
    [Number(dashboardTenants[0].id), '2026-10-15', 2, 4000],
    [Number(dashboardTenants[0].id), '2026-10-16', 1, 2000],
  ])
  assert.equal((await asUser(dashboardAdmin, () => db.query(`
    select id from tenants where canteen_id = $1 and is_active = false
  `, [dashboardCanteens[0].id]))).rows.length, 1)
  const dashboardCounts = (await asUser(dashboardAdmin, () => db.query(`
    select count(*) filter (where status in ('paid', 'accepted', 'ready')) as active,
      count(*) filter (where refund_status = 'needed') as refunds,
      sum(subtotal) filter (where refund_status = 'needed') as refund_amount
    from orders
  `))).rows[0]
  assert.deepEqual([Number(dashboardCounts.active), Number(dashboardCounts.refunds), Number(dashboardCounts.refund_amount)], [2, 2, 9000])
} finally {
  await db.exec('reset role; rollback')
}

// 14. Refund manual: hanya admin kantin sendiri, lunas + batal, dan aman diulang.
{
  const cashier = '55555555-5555-5555-5555-555555555555'
  const foreignAdmin = '66666666-6666-6666-6666-666666666666'
  const noProfile = '77777777-7777-7777-7777-777777777777'
  const foreignCanteen = (await db.query(`insert into canteens (name, slug) values ('Refund lain', 'refund-lain') returning id`)).rows[0]
  const foreignTenant = (await db.query(`insert into tenants (canteen_id, code, name) values ($1, 'R1', 'Refund lain') returning id`, [foreignCanteen.id])).rows[0]
  await db.query(`insert into auth.users values ($1), ($2), ($3)`, [cashier, foreignAdmin, noProfile])
  await db.query(`insert into profiles values ($1, 'cashier', 1, null, 'Kasir'), ($2, 'admin', $3, null, 'Admin lain')`, [cashier, foreignAdmin, foreignCanteen.id])

  const refundOrder = async (canteenId, tenantId, status = 'cancelled', refund = 'needed', paid = true) => {
    const fixtureCheckout = (await db.query(`
      insert into checkouts (canteen_id, customer_name, service_type, payment_method, payment_status, total, paid_at)
      values ($1, 'Pembeli refund', 'takeaway', 'qris', $2, 5, $3) returning id
    `, [canteenId, paid ? 'paid' : 'pending', paid ? '2026-10-15T17:00:00Z' : null])).rows[0]
    return (await db.query(`
      insert into orders (checkout_id, tenant_id, status, subtotal, paid_at, refund_status)
      values ($1, $2, $3, 5, $4, $5) returning id
    `, [fixtureCheckout.id, tenantId, status, paid ? '2026-10-15T17:00:00Z' : null, refund])).rows[0].id
  }
  const own = await refundOrder(1, 1)
  const foreign = await refundOrder(foreignCanteen.id, foreignTenant.id)
  const markDone = (id) => db.query(`select * from mark_refund_done($1)`, [id])
  for (const uid of [T1, T2, cashier, noProfile, '']) {
    await rejects(asUser(uid, () => markDone(own)), /Hanya pengelola/)
  }
  await rejects(asUser(ADMIN, () => markDone(foreign)), /tidak ditemukan/)
  await rejects(asUser(foreignAdmin, () => markDone(own)), /tidak ditemukan/)
  await rejects(asUser(ADMIN, () => markDone(999999)), /tidak ditemukan/)
  await db.exec('set role anon')
  await rejects(markDone(own), /permission denied/)
  await db.exec('reset role')
  await rejects(asUser(ADMIN, () => db.query(`update orders set refund_status = 'done' where id = $1`, [own])), /permission denied/)
  for (const [status, refund, paid] of [
    ['paid', 'needed', true], ['cancelled', 'none', true], ['cancelled', 'needed', false],
  ]) {
    const invalid = await refundOrder(1, 1, status, refund, paid)
    await rejects(asUser(ADMIN, () => markDone(invalid)), /tidak memerlukan refund|tidak ditemukan/)
  }
  const before = (await db.query(`select * from orders where id = $1`, [own])).rows[0]
  const first = (await asUser(ADMIN, () => markDone(own))).rows[0]
  assert.deepEqual(first, { ...before, refund_status: 'done' })
  assert.deepEqual((await asUser(ADMIN, () => markDone(own))).rows[0], first)
  assert.equal((await asUser(foreignAdmin, () => markDone(foreign))).rows[0].refund_status, 'done')

  // Laporan periode menjumlahkan hasil pembulatan per hari, bukan membulatkan ulang total periode.
  const roundingTenant = (await db.query(`insert into tenants (canteen_id, code, name, revenue_share_percent) values (1, 'ROUND', 'Pembulatan', 10) returning id`)).rows[0]
  for (const timestamp of ['2026-10-14T17:00:00Z', '2026-10-15T17:00:00Z', '2026-10-16T17:00:00Z']) {
    const id = await refundOrder(1, roundingTenant.id, 'completed', 'none')
    await db.query(`update orders set paid_at = $1 where id = $2`, [timestamp, id])
  }
  const report = (await asUser(ADMIN, () => db.query(`
    select sum(gross) as gross, sum(canteen_share) as canteen_share, sum(tenant_share) as tenant_share
    from tenant_daily_revenue where tenant_id = $1 and day >= '2026-10-15' and day <= '2026-10-16'
  `, [roundingTenant.id]))).rows[0]
  assert.deepEqual(Object.values(report).map(Number), [10, 2, 8])
}

// 15. Kasir tunai: total DB, uang cukup, retry idempoten, dan isolasi peran/kantin.
{
  const cashier = '55555555-5555-5555-5555-555555555555'
  const foreignAdmin = '66666666-6666-6666-6666-666666666666'
  const cashItems = JSON.stringify([{ menu_item_id: 3, quantity: 1, note: 'tunai' }])
  const requestId = '88888888-8888-4888-8888-888888888888'
  const receive = (actor = cashier, request = requestId, amount = 20000, name = 'Pembeli tunai', canteen = 1) => db.query(
    `select * from create_cash_checkout($1, $2, $3, $4, 'takeaway', $5::jsonb, $6)`,
    [canteen, actor, request, name, cashItems, amount])
  await rejects(asUser(cashier, () => receive()), /permission denied/)
  await db.exec('set role anon')
  await rejects(receive(), /permission denied/)
  await db.exec('reset role; set role service_role')
  try {
    for (const actor of [T1, T2, foreignAdmin, null]) {
      await rejects(receive(actor), /Hanya pengelola atau kasir/)
    }
    const countBefore = Number((await db.query('select count(*) as n from checkouts')).rows[0].n)
    await rejects(receive(cashier, requestId, 11999), /Uang diterima kurang/)
    assert.equal(Number((await db.query('select count(*) as n from checkouts')).rows[0].n), countBefore)
    const first = (await receive()).rows[0]
    assert.equal(first.payment_status, 'paid')
    assert.equal(Number(first.total), 12000)
    assert.equal(Number(first.cash_received), 20000)
    assert.equal(first.created_by, cashier)
    assert.equal(first.cash_request_id, requestId)
    assert.equal((await receive()).rows[0].id, first.id)
    assert.equal(Number((await db.query('select count(*) as n from checkouts')).rows[0].n), countBefore + 1)
    await rejects(receive(cashier, requestId, 25000), /pesanan berbeda/)
    await rejects(receive(ADMIN), /pesanan berbeda/)
    await rejects(receive(cashier, requestId, 20000, 'Nama berubah'), /pesanan berbeda/)
    await rejects(receive(cashier, null), /tidak valid/)
    await rejects(receive(cashier, '99999999-9999-4999-8999-999999999999', 20000, ' '), /tidak valid/)
    const adminCash = (await receive(ADMIN, '99999999-9999-4999-8999-999999999999')).rows[0]
    assert.equal(adminCash.created_by, ADMIN)
  } finally { await db.exec('reset role') }
}

console.log(`Semua tes skema lulus ✔ (${legacy ? 'hak default lama' : 'GRANT eksplisit'})`)
if (!legacy) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { env: { ...process.env, LEGACY_GRANTS: '1' }, stdio: 'inherit' })
  process.exit(r.status ?? 1)
}
