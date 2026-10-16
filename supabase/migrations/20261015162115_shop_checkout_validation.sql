create or replace function public.create_checkout(
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

  -- Validasi: menu ada, aktif, tersedia, tenant aktif & buka, di kantin yang sama. Pesan ditampilkan ke pembeli.
  select case
           when m.id is null or not m.is_active or not t.is_active or t.canteen_id <> p_canteen_id
             then 'Menu tidak tersedia: ' || coalesce(m.name, '#' || (i->>'menu_item_id'))
           when not t.is_open then t.name || ' sedang tutup. Hapus menunya dari pesanan.'
           when not m.is_available then 'Menu habis: ' || m.name
           else 'Jumlah tidak valid: ' || m.name
         end into v_bad
  from jsonb_array_elements(p_items) i
  left join public.menu_items m on m.id = (i->>'menu_item_id')::bigint
  left join public.tenants t on t.id = m.tenant_id
  where m.id is null or not m.is_active or not m.is_available
     or not t.is_active or not t.is_open or t.canteen_id <> p_canteen_id
     or coalesce((i->>'quantity')::int, 0) not between 1 and 50
  limit 1;
  if v_bad is not null then
    raise exception '%', v_bad;
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

