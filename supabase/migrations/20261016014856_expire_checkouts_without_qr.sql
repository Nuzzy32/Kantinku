-- Checkout QRIS tanpa expires_at (QR tidak pernah tersimpan) tidak lagi menggantung sebagai pending selamanya.
create or replace function public.expire_checkouts() returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  with expired as (
    update public.checkouts set payment_status = 'expired'
    -- expires_at kosong = QR tidak pernah tersimpan (server putus sebelum Xendit menjawab): kedaluwarsa 15 menit setelah dibuat.
    where payment_status = 'pending'
      and (expires_at < now() or (expires_at is null and created_at < now() - interval '15 minutes'))
    returning id
  ), orders_expired as (
    update public.orders o set status = 'expired'
    from expired e where o.checkout_id = e.id and o.status = 'pending_payment'
  )
  select count(*) into v_count from expired;
  return v_count;  -- jumlah checkout yang kedaluwarsa
end $$;
