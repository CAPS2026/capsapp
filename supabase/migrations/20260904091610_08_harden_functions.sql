-- pin search_path on the trigger functions (RLS helpers already pinned)
alter function set_updated_at() set search_path = public;
alter function sync_dog_from_activity(uuid) set search_path = public;
alter function trg_dog_activity_sync() set search_path = public;

-- RLS helpers are for policy use only, not the public RPC surface
revoke execute on function current_person_id()            from anon, public;
revoke execute on function has_role(person_role)          from anon, public;
revoke execute on function is_staff()                     from anon, public;
