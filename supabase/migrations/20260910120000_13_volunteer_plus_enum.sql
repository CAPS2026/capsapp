-- Volunteer Plus — experienced volunteers who sign in themselves and can
-- operate kiosk mode for walks + yard on behalf of others.
--
-- Run this ON ITS OWN first (ALTER TYPE ... ADD VALUE can't share a
-- transaction with statements that use the new value). Then run
-- migration 14.
alter type person_role add value if not exists 'volunteer_plus';
