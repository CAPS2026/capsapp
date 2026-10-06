-- Health concern emails get a "Mark as dealt with" link (staff app). The
-- token is the secret in that link, the same way leave_request.token is for
-- the leave email. Existing rows get a token too, but their emails have
-- already gone out without a link.
alter table health_concern
  add column if not exists token uuid not null default gen_random_uuid();

create unique index if not exists health_concern_token_key on health_concern (token);
