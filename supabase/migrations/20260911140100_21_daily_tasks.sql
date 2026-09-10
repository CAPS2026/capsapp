-- Staff zone — daily tasks. A template describes a recurring task; an
-- instance is that task on a specific day. Instances are materialised when
-- a day is opened. An instance stays 'open' (carried over, shown on later
-- days) until someone ticks it done or marks it not-required with a note.

create table if not exists task_template (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  part         text not null check (part in ('morning', 'afternoon')),
  -- 'daily' | 'weekly' (weekdays[]) | 'monthly' (day_of_month)
  repeat       text not null default 'daily' check (repeat in ('daily', 'weekly', 'monthly')),
  weekdays     int[] not null default '{}',   -- 0=Sun .. 6=Sat (JS getDay)
  day_of_month int check (day_of_month between 1 and 31),
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_by   uuid references people(id),
  created_at   timestamptz not null default now()
);

create table if not exists task_instance (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references task_template(id) on delete set null,
  date        date not null,          -- the day the task is FOR
  part        text not null check (part in ('morning', 'afternoon')),
  title       text not null,          -- snapshot; editing a template won't rewrite history
  status      text not null default 'open' check (status in ('open', 'done', 'not_required')),
  note        text,
  actioned_by uuid references people(id),
  actioned_at timestamptz,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
-- one instance per template per day
create unique index if not exists task_instance_template_date
  on task_instance(template_id, date) where template_id is not null;
create index if not exists task_instance_date_idx on task_instance(date);
create index if not exists task_instance_open_idx on task_instance(status) where status = 'open';

alter table task_template enable row level security;
alter table task_instance enable row level security;

drop policy if exists tt_staff on task_template;
create policy tt_staff on task_template for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists ti_staff on task_instance;
create policy ti_staff on task_instance for all to authenticated
  using (is_staff()) with check (is_staff());
