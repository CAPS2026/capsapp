-- Guest sign-in (Julie, 2 Oct 2026): one "Guest" caretaker tile for someone
-- covering a one-off shift. They type their name when they tap Guest; it is
-- kept on their shift so the emails, handover log and admin view say who it
-- was ("Guest (Morgan)").

alter table public.shift_log
  add column if not exists guest_name text
  check (guest_name is null or char_length(guest_name) between 1 and 60);

comment on column public.shift_log.guest_name is
  'Name typed by someone signing in on the Guest tile; null for everyone else.';

alter table public.org_settings
  add column if not exists staff_guest_person_id uuid references public.people(id) on delete set null;

comment on column public.org_settings.staff_guest_person_id is
  'The people row used as the Guest tile on the staff app sign-in screen.';
