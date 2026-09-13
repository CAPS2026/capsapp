-- Staff app: idle-based auto-close, and one guard so the end-of-shift
-- email only ever sends once per session.
--
-- `last_activity_at` starts at sign-in and is bumped on every action a
-- caretaker takes (ticking a task, claiming one, adding an extra), see
-- touchShiftActivity in src/lib/shift-data.ts. A shift only auto-closes
-- once it's both past its rostered end time AND silent for
-- org_settings.staff_autoclose_grace_minutes, so someone still working
-- (ticking things off, however late) never gets cut off.
--
-- `roster_session.email_sent_at` stops the summary email firing twice,
-- it's set once the last open shift on that session closes and the email
-- goes out. Two caretakers on one session means the email waits for
-- whichever of them signs out last.

alter table shift_log
  add column if not exists last_activity_at timestamptz not null default now();

alter table roster_session
  add column if not exists email_sent_at timestamptz;
