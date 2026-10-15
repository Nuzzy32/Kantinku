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

console.log(`Semua tes skema lulus ✔ (${legacy ? 'hak default lama' : 'GRANT eksplisit'})`)
if (!legacy) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { env: { ...process.env, LEGACY_GRANTS: '1' }, stdio: 'inherit' })
  process.exit(r.status ?? 1)
}
