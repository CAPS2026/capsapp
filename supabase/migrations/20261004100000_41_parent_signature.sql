-- Under-18 registration: the parent/guardian types their full name to give
-- consent (Paul, 2026-10-04). The app falls back gracefully (42703) if this
-- hasn't been applied yet — the typed name still goes in the confirmation
-- email, it just isn't stored on the person's record.
alter table people add column if not exists parent_signature_name text;
