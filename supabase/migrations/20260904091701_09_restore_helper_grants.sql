-- RLS policy evaluation needs `authenticated` to hold EXECUTE on these helpers
-- (confirmed: revoking it breaks policies with "permission denied for function").
-- They leak nothing: return null/false for anyone who isn't the relevant
-- person/staff. anon and public stay revoked (migration 08).
grant execute on function current_person_id()   to authenticated;
grant execute on function has_role(person_role) to authenticated;
grant execute on function is_staff()            to authenticated;
