-- Staff app — checklist categories + optional task claiming.
--
-- `task_template`/`task_instance` (migration 21) group tasks by `part`
-- (morning/afternoon) only. The printed daily checklist groups by section
-- instead (Opening, Animal Health & Welfare, Kennel & Housing Hygiene,
-- Exercise & Enrichment, Public & Committee Areas, End of Day) — `category`
-- adds that. Snapshotted onto the instance the same way `title` already
-- is, so re-categorising a template later doesn't rewrite history.
--
-- `claimed_by`/`claimed_at` are optional: a caretaker can "call" a task
-- before doing it, so two people on one shift don't duplicate work or
-- leave something nobody owns. It's a soft flag, not a lock — whoever
-- actually ticks a task done is who it's attributed to (`actioned_by`,
-- already on task_instance), claimed or not.
--
-- `is_extra` marks a task a caretaker logged themselves for something
-- off the standard list, kept separate from admin-authored ad-hoc tasks
-- (both have template_id null, so this is the only way to tell them apart).

do $$ begin
  create type task_category as enum (
    'opening',
    'animal_health_welfare',
    'kennel_housing_hygiene',
    'exercise_enrichment',
    'public_committee_areas',
    'end_of_day'
  );
exception when duplicate_object then null;
end $$;

alter table task_template
  add column if not exists category task_category;

alter table task_instance
  add column if not exists category task_category,
  add column if not exists claimed_by uuid references people(id),
  add column if not exists claimed_at timestamptz,
  add column if not exists is_extra boolean not null default false;

create index if not exists task_instance_category_idx on task_instance(category);
