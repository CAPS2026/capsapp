-- 33: staff app. New columns for "forgot to sign in", health concerns being
-- dealt with and the "nobody signed in" alert; the secret for the scheduled
-- checks; and tighter database rules (row-level security, RLS) so a staff
-- login can no longer change things only admins should.
--
-- Additive and compatible with the code already live: every change the
-- current staff app and the dog app make as a non-admin is still allowed.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

-- Why the app wasn't used at the time, for a shift entered afterwards.
alter table shift_log add column if not exists entered_afterwards_reason text;

-- A health concern dealt with by an admin. Name stored as text (no second
-- link to people) so existing lookups of the person who raised it stay
-- unambiguous.
alter table health_concern add column if not exists resolved_at timestamptz;
alter table health_concern add column if not exists resolved_by_name text;
alter table health_concern add column if not exists resolved_note text;

-- When the "nobody has signed in" alert went for a session (once only).
alter table roster_session add column if not exists no_show_alert_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Secret for the scheduled checks (/api/shift-checks). RLS on with no
-- policies: no logged-in user can read it, only the service role (the app's
-- server) and the database's own timer.
-- ---------------------------------------------------------------------------

create table if not exists shift_cron_secret (
  id boolean primary key default true check (id),
  secret text not null
);
alter table shift_cron_secret enable row level security;
revoke all on shift_cron_secret from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Who counts as restricted: a logged-in user who is not an admin. The
-- service role (app server jobs, email links) and the database owner (SQL
-- editor) are never restricted.
-- ---------------------------------------------------------------------------

-- (CASE so is_admin() is only ever called for a logged-in user; other roles
-- may not be allowed to call it.)
create or replace function staff_is_restricted() returns boolean
  language sql stable set search_path = public as $$
  select case when current_user in ('authenticated', 'anon') then not coalesce(is_admin(), false) else false end
$$;

-- True when `new` differs from `old` in anything other than the listed
-- columns.
create or replace function changed_except(o jsonb, n jsonb, allowed text[]) returns boolean
  language sql immutable as $$
  select (o - allowed) is distinct from (n - allowed)
$$;

-- org_settings: non-admins may only change the café PIN (the dog app's
-- café mode lets staff do that). Email recipients, shift times and every
-- other setting are admin only.
create or replace function org_settings_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() and changed_except(to_jsonb(old), to_jsonb(new), array['staff_pin_hash']) then
    raise exception 'Only an admin can change these settings.';
  end if;
  return new;
end $$;
drop trigger if exists org_settings_guard on org_settings;
create trigger org_settings_guard before update on org_settings
  for each row execute function org_settings_guard();

-- roster_session: non-admins may create a session (signing in creates one
-- if needed) and mark its emails sent, but not change its date or times.
create or replace function roster_session_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted()
     and changed_except(to_jsonb(old), to_jsonb(new), array['email_sent_at', 'no_show_alert_sent_at']) then
    raise exception 'Only an admin can change a roster session.';
  end if;
  return new;
end $$;
drop trigger if exists roster_session_guard on roster_session;
create trigger roster_session_guard before update on roster_session
  for each row execute function roster_session_guard();

-- shift_log: once saved, who, which session, the sign-in time and place and
-- the lateness can't be changed by a non-admin. Signing out, reasons,
-- overtime, auto-close and reopening still work.
create or replace function shift_log_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() and (
       new.person_id is distinct from old.person_id
    or new.date is distinct from old.date
    or new.part is distinct from old.part
    or new.roster_session_id is distinct from old.roster_session_id
    or new.signed_in_at is distinct from old.signed_in_at
    or new.signed_in_lat is distinct from old.signed_in_lat
    or new.signed_in_lng is distinct from old.signed_in_lng
    or new.signed_in_distance_m is distinct from old.signed_in_distance_m
    or new.late_minutes is distinct from old.late_minutes
    or new.created_at is distinct from old.created_at
    or new.entered_afterwards_reason is distinct from old.entered_afterwards_reason
  ) then
    raise exception 'Only an admin can change a recorded sign-in.';
  end if;
  return new;
end $$;
drop trigger if exists shift_log_guard on shift_log;
create trigger shift_log_guard before update on shift_log
  for each row execute function shift_log_guard();

-- leave_request: a non-admin can only withdraw a pending request (status to
-- cancelled) and mark a decision as shown. Approving, declining and editing
-- the request itself are admin only (or the email link, which runs as the
-- service role).
create or replace function leave_request_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() then
    if changed_except(to_jsonb(old), to_jsonb(new), array['status', 'shown_in_shift', 'emailed_at']) then
      raise exception 'Only an admin can change a leave request.';
    end if;
    if new.status is distinct from old.status and not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'Only an admin can decide a leave request.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists leave_request_guard on leave_request;
create trigger leave_request_guard before update on leave_request
  for each row execute function leave_request_guard();

-- health_concern: a non-admin can only record that it was emailed. Marking
-- it dealt with, or changing what was reported, is admin only.
create or replace function health_concern_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() and changed_except(to_jsonb(old), to_jsonb(new), array['emailed_at']) then
    raise exception 'Only an admin can change a health concern.';
  end if;
  return new;
end $$;
drop trigger if exists health_concern_guard on health_concern;
create trigger health_concern_guard before update on health_concern
  for each row execute function health_concern_guard();

-- handover_note: written once, never edited by a non-admin.
create or replace function handover_note_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() then
    raise exception 'Only an admin can change a handover note.';
  end if;
  return new;
end $$;
drop trigger if exists handover_note_guard on handover_note;
create trigger handover_note_guard before update on handover_note
  for each row execute function handover_note_guard();

-- ---------------------------------------------------------------------------
-- Policies: staff keep reading and writing as before, but deleting is admin
-- only, and the roster assignments (who is rostered) are admin only to
-- change. (Both apps already only change assignments from admin screens.)
-- ---------------------------------------------------------------------------

drop policy if exists sl_staff on shift_log;
drop policy if exists ti_staff on task_instance;
drop policy if exists hn_staff on handover_note;
drop policy if exists hc_staff on health_concern;
drop policy if exists lr_staff on leave_request;
drop policy if exists rs_staff on roster_session;

do $$
declare
  t text;
begin
  foreach t in array array['shift_log', 'task_instance', 'handover_note', 'health_concern', 'leave_request', 'roster_session'] loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format('create policy %I on %I for select to authenticated using (is_staff())', t || '_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (is_staff())', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using (is_staff()) with check (is_staff())', t || '_update', t);
    execute format('create policy %I on %I for delete to authenticated using (is_admin())', t || '_delete', t);
  end loop;
end $$;

drop policy if exists ra_staff on roster_assignment;
drop policy if exists roster_assignment_select on roster_assignment;
drop policy if exists roster_assignment_write on roster_assignment;
create policy roster_assignment_select on roster_assignment for select to authenticated using (is_staff());
create policy roster_assignment_write on roster_assignment for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists os_staff on org_settings;
drop policy if exists org_settings_select on org_settings;
drop policy if exists org_settings_update on org_settings;
drop policy if exists org_settings_admin on org_settings;
create policy org_settings_select on org_settings for select to authenticated using (is_staff());
create policy org_settings_update on org_settings for update to authenticated using (is_staff()) with check (is_staff());
create policy org_settings_admin on org_settings for all to authenticated using (is_admin()) with check (is_admin());
