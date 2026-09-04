-- generic updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_people_updated       before update on people            for each row execute function set_updated_at();
create trigger t_homecare_updated     before update on homecare_profile  for each row execute function set_updated_at();
create trigger t_volunteer_updated    before update on volunteer_profile for each row execute function set_updated_at();
create trigger t_dogs_updated         before update on dogs              for each row execute function set_updated_at();
create trigger t_dogconf_updated      before update on dog_confidential  for each row execute function set_updated_at();

-- recompute a dog's status + activity pointers from its activity rows
create or replace function sync_dog_from_activity(p_dog uuid) returns void language plpgsql as $$
declare
  v_open  dog_activity%rowtype;
  v_status text;
begin
  select * into v_open from dog_activity
    where dog_id = p_dog and ended_at is null
    order by started_at desc limit 1;

  if found then
    v_status := case v_open.type
      when 'walk'       then 'walking'
      when 'yard'       then 'yard'
      when 'bed_rest'   then 'bed_rest'
      when 'jail_break' then 'jail_break'
      when 'foster'     then 'fostered'
    end;
  else
    v_status := 'available';
  end if;

  update dogs d set
    status = case when d.status = 'exited' then 'exited' else v_status end,
    current_activity_id = v_open.id,
    latest_walk_id     = (select id from dog_activity where dog_id=p_dog and type='walk'
                          order by started_at desc limit 1),
    latest_yard_id     = (select id from dog_activity where dog_id=p_dog and type='yard'
                          order by started_at desc limit 1),
    latest_bedrest_id  = (select id from dog_activity where dog_id=p_dog and type='bed_rest'
                          order by started_at desc limit 1),
    latest_homecare_id = (select id from dog_activity where dog_id=p_dog and type in ('jail_break','foster')
                          order by started_at desc limit 1),
    updated_at = now()
  where d.id = p_dog;
end $$;

create or replace function trg_dog_activity_sync() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform sync_dog_from_activity(old.dog_id);
    return old;
  end if;
  perform sync_dog_from_activity(new.dog_id);
  if tg_op = 'UPDATE' and new.dog_id <> old.dog_id then
    perform sync_dog_from_activity(old.dog_id);
  end if;
  return new;
end $$;

create trigger dog_activity_sync
  after insert or update or delete on dog_activity
  for each row execute function trg_dog_activity_sync();
