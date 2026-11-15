-- Tasks can repeat every second day, counted from active_from
-- (e.g. the large drum stock check, from Tue 17 Nov 2026).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'task_template'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%repeat%'
  loop
    execute format('alter table task_template drop constraint %I', c);
  end loop;
end $$;

alter table task_template
  add constraint task_template_repeat_check
  check (repeat in ('daily', 'every_second_day', 'weekly', 'monthly'));
