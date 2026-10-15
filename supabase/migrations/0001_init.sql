-- KantinKu — skema awal (Supabase / Postgres)
-- Salin ke supabase/migrations/0001_init.sql saat project dibuat.
--
-- Aturan:
-- * Uang = rupiah utuh (bigint). IDR tidak pakai sen, jadi tidak perlu numeric.
-- * Harga di order_items adalah SNAPSHOT saat checkout, bukan referensi ke harga menu sekarang.
-- * Pembeli tidak login. Semua tulis data pembeli lewat server (secret key) memanggil fungsi di bawah.
-- * Tenant/admin/kasir login lewat Supabase Auth; aksesnya dibatasi RLS.

create schema if not exists private;

-- ---------- Tipe ----------
create type public.user_role      as enum ('admin', 'cashier', 'tenant');
create type public.order_status   as enum ('pending_payment', 'paid', 'accepted', 'ready', 'completed', 'cancelled', 'expired');
create type public.payment_status as enum ('pending', 'paid', 'expired', 'failed');
create type public.payment_method as enum ('qris', 'cash');
create type public.service_type   as enum ('dine_in', 'takeaway');
create type public.refund_status  as enum ('none', 'needed', 'done');

-- ---------- Master data ----------
create table public.canteens (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  open_time   time not null default '08:00',
  close_time  time not null default '21:00',
  created_at  timestamptz not null default now()
);

create table public.dining_tables (
  id          bigint generated always as identity primary key,
  canteen_id  bigint not null references public.canteens(id) on delete cascade,
  label       text not null,                                   -- "Meja 34"
  qr_token    uuid not null default gen_random_uuid() unique,  -- isi QR: /t/<qr_token>
  unique (canteen_id, label)
);

create table public.tenants (
  id                     bigint generated always as identity primary key,
  canteen_id             bigint not null references public.canteens(id) on delete cascade,
  code                   text not null,                        -- "T7"
  name                   text not null,
  is_open                boolean not null default false,
  is_active              boolean not null default true,
  revenue_share_percent  numeric(5,2) not null default 0 check (revenue_share_percent between 0 and 100),
  created_at             timestamptz not null default now(),
  unique (canteen_id, code)
);

create table public.menu_categories (
  id          bigint generated always as identity primary key,
  tenant_id   bigint not null references public.tenants(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  unique (id, tenant_id)  -- target FK komposit dari menu_items
);
create index menu_categories_tenant_id_idx on public.menu_categories (tenant_id);

create table public.menu_items (
  id            bigint generated always as identity primary key,
  tenant_id     bigint not null references public.tenants(id) on delete cascade,
  category_id   bigint,
  name          text not null,
  description   text,
  price         bigint not null check (price > 0),
  image_url     text,
  is_available  boolean not null default true,   -- toggle "stok habis"
  is_active     boolean not null default true,   -- false = dihapus (soft delete, riwayat tetap utuh)
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  -- Kategori wajib milik tenant yang sama. Hapus kategori = menu jadi tanpa kategori.
  foreign key (category_id, tenant_id) references public.menu_categories (id, tenant_id) on delete set null (category_id)
);
create index menu_items_tenant_id_idx   on public.menu_items (tenant_id);
create index menu_items_category_id_idx on public.menu_items (category_id);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null,
  canteen_id  bigint not null references public.canteens(id),
  tenant_id   bigint references public.tenants(id),
  full_name   text not null,
  check ((role = 'tenant') = (tenant_id is not null))
);
create index profiles_canteen_id_idx on public.profiles (canteen_id);
create index profiles_tenant_id_idx  on public.profiles (tenant_id);

-- ---------- Transaksi ----------
-- 1 checkout = 1 pembayaran, dipecah jadi beberapa orders (1 per tenant).
create table public.checkouts (
  id               bigint generated always as identity primary key,
  public_token     uuid not null default gen_random_uuid() unique,  -- link status pembeli: /order/<public_token>
  canteen_id       bigint not null references public.canteens(id),
  dining_table_id  bigint references public.dining_tables(id),
  customer_name    text not null check (length(customer_name) between 1 and 40),
  customer_phone   text,
  service_type     public.service_type not null,
  payment_method   public.payment_method not null,
  payment_status   public.payment_status not null default 'pending',
  total            bigint not null check (total > 0),
  provider_ref     text unique,          -- id QR dari payment gateway
  qr_string        text,                 -- isi QRIS untuk dirender
  expires_at       timestamptz,
  paid_at          timestamptz,
  created_by       uuid references auth.users(id),  -- kasir, untuk pesanan tunai
  created_at       timestamptz not null default now()
);
create index checkouts_canteen_id_created_at_idx on public.checkouts (canteen_id, created_at);
create index checkouts_dining_table_id_idx       on public.checkouts (dining_table_id);
create index checkouts_created_by_idx            on public.checkouts (created_by);
create index checkouts_pending_expiry_idx        on public.checkouts (expires_at) where payment_status = 'pending';

create table public.orders (
  id             bigint generated always as identity primary key,
  checkout_id    bigint not null references public.checkouts(id) on delete cascade,
  tenant_id      bigint not null references public.tenants(id),
  status         public.order_status not null default 'pending_payment',
  subtotal       bigint not null check (subtotal > 0),
  cancel_reason  text,
  refund_status  public.refund_status not null default 'none',
  paid_at        timestamptz,
  accepted_at    timestamptz,
  ready_at       timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (checkout_id, tenant_id)
);
create index orders_tenant_id_status_idx     on public.orders (tenant_id, status);
create index orders_tenant_id_created_at_idx on public.orders (tenant_id, created_at);

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders(id) on delete cascade,
  menu_item_id  bigint not null references public.menu_items(id),
  name          text not null,          -- snapshot
  unit_price    bigint not null check (unit_price > 0),  -- snapshot
  quantity      int not null check (quantity between 1 and 50),
  note          text check (length(note) <= 100)
);
create index order_items_order_id_idx     on public.order_items (order_id);
create index order_items_menu_item_id_idx on public.order_items (menu_item_id);

-- ---------- Helper RLS (dipanggil sekali per query lewat (select ...)) ----------
create function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function private.my_canteen_id() returns bigint
language sql stable security definer set search_path = '' as $$
  select canteen_id from public.profiles where id = (select auth.uid())
$$;

create function private.my_tenant_id() returns bigint
language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles where id = (select auth.uid())
$$;

grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------- RLS ----------
alter table public.canteens        enable row level security;
alter table public.dining_tables   enable row level security;
alter table public.tenants         enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.profiles        enable row level security;
alter table public.checkouts       enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;

-- Menu boleh dibaca siapa saja (pembeli tanpa login).
create policy canteens_read      on public.canteens        for select using (true);
create policy tables_read        on public.dining_tables   for select using (true);
create policy tenants_read       on public.tenants         for select using (is_active);
create policy categories_read    on public.menu_categories for select using (true);
create policy menu_items_read    on public.menu_items      for select using (is_active);

-- Tenant mengelola menunya sendiri.
create policy categories_tenant_write on public.menu_categories for all to authenticated
  using (tenant_id = (select private.my_tenant_id()))
  with check (tenant_id = (select private.my_tenant_id()));
create policy menu_items_tenant_write on public.menu_items for all to authenticated
  using (tenant_id = (select private.my_tenant_id()))
  with check (tenant_id = (select private.my_tenant_id()));
-- Tenant buka/tutup tokonya sendiri (kolom lain dikunci lewat GRANT di bawah).
create policy tenants_self_update on public.tenants for update to authenticated
  using (id = (select private.my_tenant_id()))
  with check (id = (select private.my_tenant_id()));

-- Admin mengelola semua di kantinnya.
create policy tables_admin_write on public.dining_tables for all to authenticated
  using ((select private.my_role()) = 'admin' and canteen_id = (select private.my_canteen_id()))
  with check ((select private.my_role()) = 'admin' and canteen_id = (select private.my_canteen_id()));
create policy tenants_admin_write on public.tenants for all to authenticated
  using ((select private.my_role()) = 'admin' and canteen_id = (select private.my_canteen_id()))
  with check ((select private.my_role()) = 'admin' and canteen_id = (select private.my_canteen_id()));

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or ((select private.my_role()) = 'admin' and canteen_id = (select private.my_canteen_id())));

-- Tenant hanya melihat pesanan miliknya yang SUDAH dibayar (bukan pending_payment / expired).
create policy orders_tenant_read on public.orders for select to authenticated
  using (tenant_id = (select private.my_tenant_id()) and paid_at is not null);
create policy order_items_tenant_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and o.tenant_id = (select private.my_tenant_id())
                   and o.paid_at is not null));
create policy checkouts_tenant_read on public.checkouts for select to authenticated
  using (payment_status = 'paid' and exists (
           select 1 from public.orders o
           where o.checkout_id = checkouts.id and o.tenant_id = (select private.my_tenant_id())));

-- Admin & kasir melihat semua transaksi di kantinnya.
create policy checkouts_staff_read on public.checkouts for select to authenticated
  using ((select private.my_role()) in ('admin', 'cashier') and canteen_id = (select private.my_canteen_id()));
create policy orders_staff_read on public.orders for select to authenticated
  using ((select private.my_role()) in ('admin', 'cashier') and exists (
           select 1 from public.tenants t
           where t.id = tenant_id and t.canteen_id = (select private.my_canteen_id())));
create policy order_items_staff_read on public.order_items for select to authenticated
  using ((select private.my_role()) in ('admin', 'cashier') and exists (
           select 1 from public.orders o join public.tenants t on t.id = o.tenant_id
           where o.id = order_id and t.canteen_id = (select private.my_canteen_id())));

-- Tidak ada policy INSERT/UPDATE untuk checkouts/orders/order_items:
-- semua perubahan wajib lewat fungsi di bawah.

-- Tenant hanya boleh ubah is_open di tabel tenants (admin bebas).
create function private.tenant_update_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.my_role() = 'tenant'
     and (to_jsonb(new) - 'is_open') <> (to_jsonb(old) - 'is_open') then
    raise exception 'Tenant hanya boleh mengubah status buka/tutup';
  end if;
  return new;
end $$;
create trigger tenants_update_guard before update on public.tenants
  for each row execute function private.tenant_update_guard();

-- ---------- Fungsi bisnis ----------

-- Membuat checkout + orders + order_items secara atomik. Harga diambil dari DB, bukan dari browser.
-- p_items: [{"menu_item_id": 1, "quantity": 2, "note": "tidak pedas"}, ...]
-- Hanya dipanggil server (secret key). Pesanan tunai: p_payment_method = 'cash', p_created_by = id kasir.
create function public.create_checkout(
  p_canteen_id      bigint,
  p_table_token     uuid,
  p_customer_name   text,
  p_customer_phone  text,
  p_service_type    public.service_type,
  p_payment_method  public.payment_method,
  p_items           jsonb,
  p_created_by      uuid default null
) returns public.checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_table_id  bigint;
  v_checkout  public.checkouts;
  v_bad       text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  if p_table_token is not null then
    select id into v_table_id from public.dining_tables
    where qr_token = p_table_token and canteen_id = p_canteen_id;
    if v_table_id is null then raise exception 'Meja tidak ditemukan'; end if;
  end if;

  -- Validasi: menu ada, aktif, tersedia, tenant aktif & buka, di kantin yang sama.
  select coalesce(m.name, '#' || (i->>'menu_item_id')) into v_bad
  from jsonb_array_elements(p_items) i
  left join public.menu_items m on m.id = (i->>'menu_item_id')::bigint
  left join public.tenants t on t.id = m.tenant_id
  where m.id is null or not m.is_active or not m.is_available
     or not t.is_active or not t.is_open or t.canteen_id <> p_canteen_id
     or coalesce((i->>'quantity')::int, 0) not between 1 and 50
  limit 1;
  if v_bad is not null then
    raise exception 'Menu tidak tersedia: %', v_bad;
  end if;

  insert into public.checkouts (canteen_id, dining_table_id, customer_name, customer_phone,
                                service_type, payment_method, total, created_by)
  select p_canteen_id, v_table_id, p_customer_name, p_customer_phone,
         p_service_type, p_payment_method, sum(m.price * (i->>'quantity')::int), p_created_by
  from jsonb_array_elements(p_items) i
  join public.menu_items m on m.id = (i->>'menu_item_id')::bigint
  returning * into v_checkout;

  insert into public.orders (checkout_id, tenant_id, subtotal)
  select v_checkout.id, m.tenant_id, sum(m.price * (i->>'quantity')::int)
  from jsonb_array_elements(p_items) i
  join public.menu_items m on m.id = (i->>'menu_item_id')::bigint
  group by m.tenant_id;

  insert into public.order_items (order_id, menu_item_id, name, unit_price, quantity, note)
  select o.id, m.id, m.name, m.price, (i->>'quantity')::int, nullif(i->>'note', '')
  from jsonb_array_elements(p_items) i
  join public.menu_items m on m.id = (i->>'menu_item_id')::bigint
  join public.orders o on o.checkout_id = v_checkout.id and o.tenant_id = m.tenant_id;

  -- Tunai: kasir sudah terima uang, langsung lunas.
  if p_payment_method = 'cash' then
    v_checkout := public.mark_checkout_paid(v_checkout.id, v_checkout.total);
  end if;

  return v_checkout;
end $$;

-- Tandai lunas. Idempoten: webhook yang datang 2x tidak mengubah apa-apa.
-- p_amount = nominal yang benar-benar dibayar (dari Xendit); harus sama dengan total.
-- Pembayaran yang telat (checkout sudah expired) tetap dicatat: uang sudah masuk, pesanan dihidupkan lagi.
create function public.mark_checkout_paid(p_checkout_id bigint, p_amount bigint)
returns public.checkouts
language plpgsql security definer set search_path = '' as $$
declare v_checkout public.checkouts;
begin
  select * into v_checkout from public.checkouts where id = p_checkout_id for update;
  if v_checkout.id is null then raise exception 'Checkout tidak ditemukan'; end if;
  if p_amount is distinct from v_checkout.total then
    raise exception 'Nominal % tidak sama dengan total %', p_amount, v_checkout.total;
  end if;
  if v_checkout.payment_status = 'paid' then return v_checkout; end if;

  update public.checkouts
  set payment_status = 'paid', paid_at = now()
  where id = p_checkout_id
  returning * into v_checkout;

  update public.orders set status = 'paid', paid_at = now()
  where checkout_id = p_checkout_id and status in ('pending_payment', 'expired');
  return v_checkout;
end $$;

-- Kedaluwarsakan checkout QRIS yang tidak dibayar. Jadwalkan tiap menit lewat pg_cron:
--   select cron.schedule('expire-checkouts', '* * * * *', 'select public.expire_checkouts()');
create function public.expire_checkouts() returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  with expired as (
    update public.checkouts set payment_status = 'expired'
    where payment_status = 'pending' and expires_at < now()
    returning id
  ), orders_expired as (
    update public.orders o set status = 'expired'
    from expired e where o.checkout_id = e.id and o.status = 'pending_payment'
  )
  select count(*) into v_count from expired;
  return v_count;  -- jumlah checkout yang kedaluwarsa
end $$;

-- Tenant (atau admin) mengubah status pesanan. Transisi yang sah:
--   paid -> accepted | cancelled
--   accepted -> ready | cancelled
--   ready -> completed
create function public.set_order_status(
  p_order_id bigint,
  p_status   public.order_status,
  p_reason   text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order  public.orders;
  v_role   public.user_role := private.my_role();
  v_tenant bigint := private.my_tenant_id();
  v_canteen bigint := private.my_canteen_id();
begin
  select o.* into v_order from public.orders o
  join public.tenants t on t.id = o.tenant_id
  where o.id = p_order_id
    and ((v_role = 'tenant' and o.tenant_id = v_tenant)
      or (v_role = 'admin' and t.canteen_id = v_canteen))
  for update of o;

  if v_order.id is null then raise exception 'Pesanan tidak ditemukan'; end if;

  if not (
       (v_order.status = 'paid'     and p_status in ('accepted', 'cancelled'))
    or (v_order.status = 'accepted' and p_status in ('ready', 'cancelled'))
    or (v_order.status = 'ready'    and p_status = 'completed')
  ) then
    raise exception 'Tidak bisa mengubah status % ke %', v_order.status, p_status;
  end if;

  if p_status = 'cancelled' and coalesce(trim(p_reason), '') = '' then
    raise exception 'Alasan pembatalan wajib diisi';
  end if;

  update public.orders set
    status        = p_status,
    accepted_at   = case when p_status = 'accepted'  then now() else accepted_at end,
    ready_at      = case when p_status = 'ready'     then now() else ready_at end,
    completed_at  = case when p_status = 'completed' then now() else completed_at end,
    cancel_reason = case when p_status = 'cancelled' then p_reason else cancel_reason end,
    refund_status = case when p_status = 'cancelled' then 'needed'::public.refund_status else refund_status end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end $$;

-- Hak eksekusi: fungsi server-only tidak boleh dipanggil dari browser.
revoke execute on function public.create_checkout(bigint, uuid, text, text, public.service_type, public.payment_method, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.mark_checkout_paid(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.expire_checkouts() from public, anon, authenticated;
revoke execute on function public.set_order_status(bigint, public.order_status, text) from public, anon;
grant  execute on function public.set_order_status(bigint, public.order_status, text) to authenticated;

-- ---------- Laporan ----------
-- Omzet & bagi hasil per tenant per hari (hanya pesanan selesai/berjalan yang lunas, bukan yang batal).
create view public.tenant_daily_revenue with (security_invoker = true) as
select
  o.tenant_id,
  (o.paid_at at time zone 'Asia/Jakarta')::date              as day,
  count(*)                                                    as order_count,
  sum(o.subtotal)                                             as gross,
  round(sum(o.subtotal) * t.revenue_share_percent / 100)::bigint as canteen_share,
  sum(o.subtotal) - round(sum(o.subtotal) * t.revenue_share_percent / 100)::bigint as tenant_share
from public.orders o
join public.tenants t on t.id = o.tenant_id
where o.status in ('paid', 'accepted', 'ready', 'completed')
group by o.tenant_id, day, t.revenue_share_percent;

-- ---------- Hak akses Data API (GRANT eksplisit) ----------
-- Mulai 30 Okt 2026 Supabase tidak lagi memberi hak otomatis ke tabel/fungsi baru di schema public.
-- GRANT menentukan tabel mana yang terjangkau Data API; RLS menentukan baris mana yang terlihat.
-- Tidak ada GRANT = 42501 permission denied. Jangan andalkan default privileges.
grant select on public.canteens, public.dining_tables,
                public.menu_categories, public.menu_items to anon;
-- Bagi hasil tenant bukan data publik: anon hanya dapat kolom yang dipakai halaman menu.
grant select (id, canteen_id, code, name, is_open, is_active) on public.tenants to anon;

grant select on public.canteens, public.dining_tables, public.tenants, public.menu_categories,
                public.menu_items, public.profiles, public.checkouts, public.orders,
                public.order_items, public.tenant_daily_revenue to authenticated;
-- Tulis langsung hanya untuk data master. checkouts/orders/order_items/profiles: lewat fungsi atau server.
grant insert, update, delete on public.menu_categories, public.menu_items,
                                public.dining_tables, public.tenants to authenticated;

-- Server (secret key). Fungsi bisnis server-only hanya boleh dipanggil service_role.
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.create_checkout(bigint, uuid, text, text, public.service_type, public.payment_method, jsonb, uuid) to service_role;
grant execute on function public.mark_checkout_paid(bigint, bigint) to service_role;
grant execute on function public.expire_checkouts() to service_role;

-- ---------- Realtime ----------
-- Dashboard tenant subscribe ke perubahan tabel orders (RLS tetap berlaku).
alter publication supabase_realtime add table public.orders;
