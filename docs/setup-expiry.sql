-- Jalankan sebagai postgres di Supabase SQL Editor sesudah migration.
-- Aman diulang: nama job yang sama memperbarui jadwal yang sudah ada.
-- Dokumentasi: https://supabase.com/docs/guides/cron/quickstart
create extension if not exists pg_cron;
select cron.schedule('expire-checkouts', '* * * * *', 'select public.expire_checkouts()');

-- Pastikan hanya satu job aktif, lalu periksa hasil sesudah setidaknya satu menit.
select jobid, jobname, schedule, command, active from cron.job where jobname = 'expire-checkouts';
select j.jobname, r.status, r.return_message, r.start_time, r.end_time
from cron.job_run_details r join cron.job j using (jobid)
where j.jobname = 'expire-checkouts' order by r.start_time desc limit 5;
