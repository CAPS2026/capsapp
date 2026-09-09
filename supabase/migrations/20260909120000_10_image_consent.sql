-- Volunteer registration captures a promotional-image consent (Yes/No)
-- from the original CAPS General Application form. Nullable: existing rows
-- and staff-created records that never answered it stay null ("not asked").
alter table people add column if not exists image_consent boolean;

comment on column people.image_consent is
  'Consent to use the person''s image for CAPS promotion (Facebook, flyers). Null = not asked.';
