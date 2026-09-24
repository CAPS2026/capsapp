-- A shift closed automatically while the person was still working can now be
-- reopened when they tap their name again (instead of starting a second,
-- duplicate shift). This records when that happened, so the shift email can
-- say so and an updated email can go out if the first one had already been sent.

alter table shift_log add column if not exists reopened_at timestamptz;
