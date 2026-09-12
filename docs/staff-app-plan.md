# CAPS Staff app plan

A staff app for the three part-time caretakers: shift sign-in, a checklist
matching the printed daily checklist, and a shift handover log. It runs in
the same repo, the same Supabase project and the same Vercel deploy as the
dog-enrichment app, but shows up as its own icon on the office tablet with
its own screens, built without touching any existing dog-app file. Being
built by Julie; Paul continues the dog-enrichment side. Concept mockup
iterated at https://claude.ai/code/artifact/0147883b-32ec-4d3a-b55a-ff27851d0440
(not public, ask Julie if you need to see it).

## Device reality

One shared tablet, in the office, next to the Starlink router, used for
both apps. Landscape, on a stand. Not personal phones. This shapes a lot
of the design below.

## Sign-in: name + PIN, not per-shift GPS-as-proof

Since it's one stationary shared tablet, its GPS reading is always the
same regardless of who's holding it. It verifies the tablet's location,
not the person. So identity comes from a "who's working right now?" name
picker (today's rostered names, largest tap targets) plus a short PIN,
not from location.

GPS is still captured at sign-in (`shift_log.signed_in_lat/lng`,
distance from `org_settings.shelter_lat/lng` in
`signed_in_distance_m`), compared against
`org_settings.shift_geofence_radius_m` (default 150m). An out-of-range
sign-in doesn't block anything, it's a flag that rides along in that
day's end-of-shift email, not a separate alert. `shelter_lat`/`shelter_lng`
are left null until an admin sets them; the check is skipped while null
rather than false-flagging everyone.

Starlink's IP address was considered and rejected for location: satellite
backhaul geolocates to the ground station, not the dish, so it would
misreport "somewhere else entirely," not just imprecisely.

## Late sign-in

If sign-in is more than `org_settings.staff_late_after_minutes` (default
10) after the rostered session start, prompt for an optional reason
(`shift_log.late_reason`). Not mandatory for on-time sign-ins, no added
friction for the common case. A late sign-in with no reason given is its
own visible signal in the email.

## Checklist: categories, claiming, extras

- `task_instance.category` groups tasks the way the printed checklist
  does: Opening, Animal Health & Welfare, Kennel & Housing Hygiene,
  Exercise & Enrichment, Public & Committee Areas, End of Day, not just
  morning/afternoon.
- Any caretaker (not just admin) can add an ad-hoc task for something
  that isn't on the standard list (`is_extra = true`). Shown in its own
  "Extra, off the checklist" section, still flows into rollover, handover
  and the shift email, tagged EXTRA.
- Two people on one shift **do not** just tick from one ambiguous shared
  list. Either can claim a task before doing it (`claimed_by`/`claimed_at`),
  a soft "this one's mine" flag, not a lock. Whoever actually ticks a
  task done is who it's attributed to (`actioned_by`, already existed),
  claimed or not. Claiming is optional per-task, not an upfront
  divide-the-whole-list ritual before the shift starts.
- Rollover (a task stays open and reappears flagged "carried over") and
  "not needed" (requires typing a reason first) already existed in
  migration 21. Nothing new needed there, just wire the new categories
  through it.

## Shift close: no hard cutoff at the scheduled end time

A shift stays open as long as there's recent activity (a tick, a claim),
no matter how late that runs. Overtime or a late start running long
never gets cut off. It only auto-closes (`shift_log.auto_closed = true`)
after `org_settings.staff_autoclose_grace_minutes` (default 60) of **no
activity at all** past the scheduled end, catching an abandoned session,
not a busy one. A manual "Add time" action is available for anyone who
knows in advance they'll run long.

## End-of-shift email: schema only for now, sending on hold

One email per shift session, to `org_settings.staff_shift_email_recipients`
(Renee, Shayna), split into a clearly separated block per person who
worked it: done / not needed (with reason) / not done or rolled over /
claimed-not-done / extras, plus the late-sign-in and off-site flags. A
task nobody claimed and nobody ticked is listed once against the shift as
a whole, not attached to a person.

**Recipient addresses are deliberately never written into this repo**, it's
public. They belong in `org_settings.staff_shift_email_recipients` (data in
Supabase, set from a settings screen), the same pattern as the existing
`org_settings.alert_recipients`. Actual sending is on hold per Julie
(12 Sep). Build the data model now, wire up Resend later.

## Two icons, one tablet

A second `manifest.json` for the staff routes, so "CAPS Staff" installs to
the tablet's home screen as its own icon, next to the existing "CAPS App"
icon for the dog side. Same login underneath either way.

## Explicitly not doing

- Not touching, editing, or removing anything in the existing dog-enrichment
  app, including the current `/staff` tab. Out of scope, being handled
  separately.
- Not sending real emails yet (see above).
- Not blocking on Renee/Shayna's real addresses or the three real caretaker
  logins to start building, both wire in as settings/data once they exist.

## Status

12 Sep 2026. Schema drafted (migrations 22-24), not yet applied to the
live Supabase project. Screens not started.
