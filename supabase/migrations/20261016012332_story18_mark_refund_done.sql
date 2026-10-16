-- Refund manual hanya dicatat pengelola kantin; UPDATE orders langsung tetap dilarang.
create function public.mark_refund_done(p_order_id bigint) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null or private.my_role() is distinct from 'admin'::public.user_role then
    raise exception 'Hanya pengelola yang boleh menyelesaikan refund';
  end if;

  select o.* into v_order from public.orders o
  join public.tenants t on t.id = o.tenant_id
  join public.checkouts c on c.id = o.checkout_id
  where o.id = p_order_id
    and t.canteen_id = private.my_canteen_id()
    and c.canteen_id = t.canteen_id
    and c.payment_status = 'paid'
  for update of o;

  if v_order.id is null then raise exception 'Pesanan refund tidak ditemukan'; end if;
  if v_order.status <> 'cancelled' or v_order.paid_at is null
    or v_order.refund_status not in ('needed', 'done') then
    raise exception 'Pesanan tidak memerlukan refund';
  end if;

  if v_order.refund_status = 'done' then return v_order; end if;

  update public.orders set refund_status = 'done'
  where id = p_order_id returning * into v_order;
  return v_order;
end $$;

revoke execute on function public.mark_refund_done(bigint) from public, anon;
grant execute on function public.mark_refund_done(bigint) to authenticated;
