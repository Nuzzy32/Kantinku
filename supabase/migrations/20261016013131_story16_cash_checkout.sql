alter table public.checkouts
  add column cash_request_id uuid unique,
  add column cash_request_hash text,
  add column cash_received bigint check (cash_received >= total);

-- Pesanan tunai server-only: otorisasi, nominal, dan retry diperiksa dalam satu transaksi.
create function public.create_cash_checkout(
  p_canteen_id bigint,
  p_created_by uuid,
  p_request_id uuid,
  p_customer_name text,
  p_service_type public.service_type,
  p_items jsonb,
  p_cash_received bigint
) returns public.checkouts
language plpgsql security definer set search_path = '' as $$
declare
  v_checkout public.checkouts;
  v_hash text;
begin
  if p_request_id is null or p_customer_name is null or length(btrim(p_customer_name)) not between 1 and 40
     or p_service_type is null or p_cash_received is null or p_cash_received < 0
     or p_cash_received > 9007199254740991
     or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Data pesanan tunai tidak valid.';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Data pesanan tunai tidak valid.';
  end if;
  perform 1 from public.profiles
  where id = p_created_by and canteen_id = p_canteen_id and role in ('admin', 'cashier')
  for share;
  if not found then raise exception 'Hanya pengelola atau kasir kantin ini yang dapat menerima tunai.'; end if;

  v_hash := md5(jsonb_build_array(p_canteen_id, p_created_by, btrim(p_customer_name), p_service_type, p_items, p_cash_received)::text);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_checkout from public.checkouts where cash_request_id = p_request_id;
  if found then
    if v_checkout.created_by is distinct from p_created_by or v_checkout.cash_request_hash is distinct from v_hash then
      raise exception 'Permintaan tunai ini sudah digunakan untuk pesanan berbeda.';
    end if;
    return v_checkout;
  end if;

  -- Harga dan ketersediaan tidak boleh berubah di tengah pencatatan pembayaran.
  perform m.id from public.menu_items m
  join public.tenants t on t.id = m.tenant_id
  where m.id in (select (i->>'menu_item_id')::bigint from jsonb_array_elements(p_items) i)
  order by m.id for share of m, t;
  v_checkout := public.create_checkout(p_canteen_id, null, btrim(p_customer_name), null,
    p_service_type, 'cash', p_items, p_created_by);
  if p_cash_received < v_checkout.total then
    raise exception 'Uang diterima kurang dari total pesanan. Periksa nominalnya.';
  end if;
  update public.checkouts set cash_request_id = p_request_id, cash_request_hash = v_hash,
    cash_received = p_cash_received where id = v_checkout.id returning * into v_checkout;
  return v_checkout;
end $$;
revoke execute on function public.create_cash_checkout(bigint, uuid, uuid, text, public.service_type, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.create_cash_checkout(bigint, uuid, uuid, text, public.service_type, jsonb, bigint) to service_role;
