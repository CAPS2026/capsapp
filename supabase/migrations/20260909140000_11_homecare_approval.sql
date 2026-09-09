-- Step 4 — homecare approval flow.

-- The yard-check screen records free-text observations / improvements
-- needed alongside the existing yard_check_done/by/on flags.
alter table homecare_profile add column if not exists yard_check_notes text;

-- Where the "new homecare application" notification email is sent. Kept
-- configurable; starts as the CAPS account address.
alter table org_settings add column if not exists admin_notification_email text;
update org_settings
  set admin_notification_email = 'consult@capeanimalprotectionshelter.org.au'
  where admin_notification_email is null;

-- One-click "approve" links in the notification email. Only jail break
-- uses these (foster is approved in-app after the home visit). Single use,
-- time limited. Touched only by the service-role client, so RLS is on with
-- no policies (deny all).
create table if not exists homecare_approval_tokens (
  token          uuid primary key default gen_random_uuid(),
  person_role_id uuid not null references person_roles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  used_at        timestamptz,
  expires_at     timestamptz not null default (now() + interval '45 days')
);
alter table homecare_approval_tokens enable row level security;
