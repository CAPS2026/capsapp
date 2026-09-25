-- 34: the staff app's timer. Every 15 minutes the database calls
-- /api/shift-checks, which closes abandoned shifts, sends any shift email
-- that is due and warns about a rostered session nobody has signed in to,
-- whether or not anyone has the app open.
--
-- The secret is generated here, in the database, so it is never in the
-- repo. The route checks the header against the same table.

create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into shift_cron_secret (id, secret)
values (true, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'caps-shift-checks';

select cron.schedule(
  'caps-shift-checks',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://capsapp-five.vercel.app/api/shift-checks',
    headers := jsonb_build_object('x-cron-secret', (select secret from public.shift_cron_secret where id)),
    timeout_milliseconds := 60000
  );
  $$
);
