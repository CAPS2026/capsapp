-- "Can't be done now" on a task left by an earlier shift (Julie, 24 Oct 2026).
-- Some leftover tasks can never be done late (e.g. "Put cookers on overnight"
-- for last night). The only way to clear them was to tick them, which made the
-- shift email say they were done. A missed task is closed (status not_required)
-- with a reason, flagged `missed` so the email lists it as MISSED, not done.
alter table task_instance add column if not exists missed boolean not null default false;
