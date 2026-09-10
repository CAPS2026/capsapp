-- Merge a duplicate person record into another (docs/ui-flows.md §8 dedupe
-- part c). Everything owned by p_remove is reassigned to p_keep, missing
-- scalar details on p_keep are backfilled from p_remove, then p_remove is
-- deleted. One transaction — all or nothing.
--
-- Called only from the staff-gated `mergePeople` server action via the
-- service role; not granted to anon/authenticated.
create or replace function merge_people(p_keep uuid, p_remove uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remove people%rowtype;
  v_keep_auth uuid;
begin
  if p_keep = p_remove then
    raise exception 'Cannot merge a record into itself';
  end if;

  select * into v_remove from people where id = p_remove;
  if not found then raise exception 'The record to remove was not found'; end if;

  select auth_user_id into v_keep_auth from people where id = p_keep;
  if not found then raise exception 'The record to keep was not found'; end if;

  if v_keep_auth is not null and v_remove.auth_user_id is not null then
    raise exception 'Both records have a login account - remove one login before merging';
  end if;

  -- Release unique-constrained values (email, auth_user_id) on the row we
  -- are about to delete, so they can be copied onto the kept row.
  update people set email = null, auth_user_id = null where id = p_remove;

  update people k set
    nickname              = coalesce(k.nickname, v_remove.nickname),
    email                 = coalesce(k.email, v_remove.email),
    phone                 = coalesce(k.phone, v_remove.phone),
    date_of_birth         = coalesce(k.date_of_birth, v_remove.date_of_birth),
    address               = coalesce(k.address, v_remove.address),
    ec_name               = coalesce(k.ec_name, v_remove.ec_name),
    ec_phone              = coalesce(k.ec_phone, v_remove.ec_phone),
    ec_email              = coalesce(k.ec_email, v_remove.ec_email),
    ec_relationship       = coalesce(k.ec_relationship, v_remove.ec_relationship),
    parent_name           = coalesce(k.parent_name, v_remove.parent_name),
    parent_phone          = coalesce(k.parent_phone, v_remove.parent_phone),
    parent_email          = coalesce(k.parent_email, v_remove.parent_email),
    parental_consent      = k.parental_consent or v_remove.parental_consent,
    parental_consent_date = coalesce(k.parental_consent_date, v_remove.parental_consent_date),
    image_consent         = coalesce(k.image_consent, v_remove.image_consent),
    photo_path            = coalesce(k.photo_path, v_remove.photo_path),
    legacy_volunteer_id   = coalesce(k.legacy_volunteer_id, v_remove.legacy_volunteer_id),
    legacy_homecarer_id   = coalesce(k.legacy_homecarer_id, v_remove.legacy_homecarer_id),
    auth_user_id          = coalesce(k.auth_user_id, v_remove.auth_user_id),
    notes_internal        = nullif(
      concat_ws(E'\n\n',
        k.notes_internal,
        case when v_remove.notes_internal is not null
             then '(merged from duplicate) ' || v_remove.notes_internal end),
      '')
  where k.id = p_keep;

  -- person_roles has a unique (person_id, role). Where both records hold
  -- the same role, upgrade the kept row if the removed one is further
  -- along, then drop the removed duplicate; move everything else.
  update person_roles k set
    status      = r.status,
    granted_on  = coalesce(k.granted_on, r.granted_on),
    approved_by = coalesce(k.approved_by, r.approved_by),
    note        = coalesce(k.note, r.note)
  from person_roles r
  where k.person_id = p_keep and r.person_id = p_remove and k.role = r.role
    and (case r.status when 'active' then 3 when 'pending' then 2 when 'declined' then 1 else 0 end)
      > (case k.status when 'active' then 3 when 'pending' then 2 when 'declined' then 1 else 0 end);

  delete from homecare_approval_tokens t
  using person_roles r
  where t.person_role_id = r.id and r.person_id = p_remove
    and exists (select 1 from person_roles k where k.person_id = p_keep and k.role = r.role);

  delete from person_roles r
  where r.person_id = p_remove
    and exists (select 1 from person_roles k where k.person_id = p_keep and k.role = r.role);

  update person_roles set person_id = p_keep where person_id = p_remove;
  update person_roles set approved_by = p_keep where approved_by = p_remove;

  -- 1:1 profiles — move only if the kept record has none, else keep wins.
  update volunteer_profile set person_id = p_keep
    where person_id = p_remove
      and not exists (select 1 from volunteer_profile where person_id = p_keep);
  delete from volunteer_profile where person_id = p_remove;

  update homecare_profile set person_id = p_keep
    where person_id = p_remove
      and not exists (select 1 from homecare_profile where person_id = p_keep);
  delete from homecare_profile where person_id = p_remove;
  update homecare_profile set yard_check_by = p_keep where yard_check_by = p_remove;

  -- Activity, events, notes, visits.
  update dog_activity   set person_id  = p_keep where person_id  = p_remove;
  update dog_activity   set placed_by  = p_keep where placed_by  = p_remove;
  update dog_activity   set edited_by  = p_keep where edited_by  = p_remove;
  update dog_activity   set created_by = p_keep where created_by = p_remove;
  update medical_events set created_by = p_keep where created_by = p_remove;
  update notes set author_id = p_keep where author_id = p_remove;
  update notes set subject_id = p_keep where subject_type = 'person' and subject_id = p_remove;
  update site_visits set person_id = p_keep where person_id = p_remove;

  delete from people where id = p_remove;
end $$;

revoke all on function merge_people(uuid, uuid) from public, anon, authenticated;
grant execute on function merge_people(uuid, uuid) to service_role;
