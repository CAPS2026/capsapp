-- helper functions (security definer so they can read people/person_roles under RLS)
create or replace function current_person_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid()
$$;

create or replace function has_role(p_role person_role) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from person_roles
    where person_id = current_person_id() and role = p_role and status = 'active'
  )
$$;

create or replace function is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(has_role('staff') or has_role('committee'), false)
$$;

-- reference tables: authenticated read, staff write
do $$
declare t text;
begin
  foreach t in array array['dog_statuses','volunteer_interest','arrival_type','exit_type',
                           'site_visit_reason','medical_event_type']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy ref_read on %I for select to authenticated using (true)', t);
    execute format('create policy ref_write on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- org settings: staff only
alter table org_settings enable row level security;
create policy os_staff on org_settings for all to authenticated using (is_staff()) with check (is_staff());

-- people
alter table people enable row level security;
create policy people_select on people for select to authenticated
  using (is_staff() or id = current_person_id());
create policy people_update on people for update to authenticated
  using (is_staff() or id = current_person_id())
  with check (is_staff() or id = current_person_id());
create policy people_insert on people for insert to authenticated with check (is_staff());
create policy people_delete on people for delete to authenticated using (is_staff());

-- person_roles
alter table person_roles enable row level security;
create policy pr_select on person_roles for select to authenticated
  using (is_staff() or person_id = current_person_id());
create policy pr_write on person_roles for all to authenticated
  using (is_staff()) with check (is_staff());

-- homecare_profile / volunteer_profile: staff or self
alter table homecare_profile enable row level security;
create policy hp_select on homecare_profile for select to authenticated
  using (is_staff() or person_id = current_person_id());
create policy hp_upsert on homecare_profile for insert to authenticated
  with check (is_staff() or person_id = current_person_id());
create policy hp_update on homecare_profile for update to authenticated
  using (is_staff() or person_id = current_person_id())
  with check (is_staff() or person_id = current_person_id());
create policy hp_delete on homecare_profile for delete to authenticated using (is_staff());

alter table volunteer_profile enable row level security;
create policy vp_select on volunteer_profile for select to authenticated
  using (is_staff() or person_id = current_person_id());
create policy vp_upsert on volunteer_profile for insert to authenticated
  with check (is_staff() or person_id = current_person_id());
create policy vp_update on volunteer_profile for update to authenticated
  using (is_staff() or person_id = current_person_id())
  with check (is_staff() or person_id = current_person_id());
create policy vp_delete on volunteer_profile for delete to authenticated using (is_staff());

-- dogs: authenticated read, staff write
alter table dogs enable row level security;
create policy dogs_select on dogs for select to authenticated using (true);
create policy dogs_write on dogs for all to authenticated using (is_staff()) with check (is_staff());

-- confidential + medical: staff only
alter table dog_confidential enable row level security;
create policy dc_staff on dog_confidential for all to authenticated using (is_staff()) with check (is_staff());
alter table medical_events enable row level security;
create policy me_staff on medical_events for all to authenticated using (is_staff()) with check (is_staff());

-- dog media: authenticated read, staff write
alter table dog_media enable row level security;
create policy dm_select on dog_media for select to authenticated using (true);
create policy dm_write on dog_media for all to authenticated using (is_staff()) with check (is_staff());

-- dog_activity: everyone reads; volunteers log/edit their own walks; staff do anything
alter table dog_activity enable row level security;
create policy da_select on dog_activity for select to authenticated using (true);
create policy da_insert on dog_activity for insert to authenticated
  with check (is_staff() or (type = 'walk' and person_id = current_person_id()));
create policy da_update on dog_activity for update to authenticated
  using (is_staff() or person_id = current_person_id())
  with check (is_staff() or person_id = current_person_id());
create policy da_delete on dog_activity for delete to authenticated using (is_staff());

-- notes
alter table notes enable row level security;
create policy notes_select on notes for select to authenticated
  using (is_staff() or visibility = 'all');
create policy notes_insert on notes for insert to authenticated
  with check (is_staff() or author_id = current_person_id());
create policy notes_update on notes for update to authenticated
  using (is_staff() or author_id = current_person_id())
  with check (is_staff() or author_id = current_person_id());
create policy notes_delete on notes for delete to authenticated using (is_staff());

-- site visits: any authenticated user can sign people in/out; staff can delete
alter table site_visits enable row level security;
create policy sv_select on site_visits for select to authenticated using (true);
create policy sv_insert on site_visits for insert to authenticated with check (true);
create policy sv_update on site_visits for update to authenticated using (true) with check (true);
create policy sv_delete on site_visits for delete to authenticated using (is_staff());
