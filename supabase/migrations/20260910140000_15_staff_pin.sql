-- Café mode: a shared iPad runs a limited "volunteer" surface (walks +
-- yard check in/out, basic dog info) after a staff member taps "Hand to
-- volunteers". Stepping back up to full staff access needs a short shared
-- PIN, stored here as a scrypt hash ("scrypt$<saltHex>$<hashHex>").
-- Null = no PIN set yet; the app prompts a staff member to set one.
alter table org_settings add column if not exists staff_pin_hash text;
