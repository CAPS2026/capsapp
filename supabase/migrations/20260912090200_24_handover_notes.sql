-- Staff app: shift handover notes. Separate from task_instance.note
-- (which is context on one specific task), this is a freeform log for
-- anything worth telling the next shift, shown as its own feed.

create table if not exists handover_note (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references people(id) on delete cascade,
  shift_log_id  uuid references shift_log(id) on delete set null,
  date          date not null,
  part          text not null check (part in ('morning', 'afternoon')),
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists handover_note_date_idx on handover_note(date desc, created_at desc);

alter table handover_note enable row level security;

drop policy if exists hn_staff on handover_note;
create policy hn_staff on handover_note for all to authenticated
  using (is_staff()) with check (is_staff());
