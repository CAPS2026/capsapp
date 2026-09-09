-- Volunteer Plus kiosk permissions. Run AFTER migration 13.

create or replace function is_volunteer_plus() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(has_role('volunteer_plus'), false)
$$;
revoke all on function is_volunteer_plus() from public, anon;
grant execute on function is_volunteer_plus() to authenticated;

-- dog_activity: staff can do anything; a Volunteer Plus can insert/close
-- walk + yard rows for anyone (kiosk mode); a plain volunteer can still
-- only log their own walks.
drop policy if exists da_insert on dog_activity;
create policy da_insert on dog_activity for insert to authenticated
  with check (
    is_staff()
    or (is_volunteer_plus() and type in ('walk', 'yard'))
    or (type = 'walk' and person_id = current_person_id())
  );

drop policy if exists da_update on dog_activity;
create policy da_update on dog_activity for update to authenticated
  using (
    is_staff()
    or (is_volunteer_plus() and type in ('walk', 'yard'))
    or person_id = current_person_id()
  )
  with check (
    is_staff()
    or (is_volunteer_plus() and type in ('walk', 'yard'))
    or person_id = current_person_id()
  );
