-- Admin helper + bootstrap. Run AFTER migration 18.

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(has_role('admin'), false)
$$;
revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- Admin is a superset of staff — fold it into is_staff() so every
-- existing is_staff()-gated RLS policy also lets an admin through, even
-- an admin who has no separate staff/committee role.
create or replace function is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(has_role('staff') or has_role('committee') or has_role('admin'), false)
$$;

-- The one existing staff member becomes an admin too, so nothing they do
-- today breaks. New admins are granted from the People area by an admin.
insert into person_roles (person_id, role, status, granted_on, note)
select id, 'admin', 'active', current_date, 'Bootstrapped as the first admin'
from people
where email = 'consult@capeanimalprotectionshelter.org.au'
on conflict (person_id, role) do update set status = 'active', ended_on = null;

-- No RLS changes yet: admin-only enforcement lives in the server actions
-- for the handful of privileged operations (all of which already run via
-- the service role). is_admin() is defined now so tightening specific
-- policies later is a one-liner.
