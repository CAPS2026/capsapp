// Confirmation email sent to the parent/guardian of an under-18 volunteer
// once they've given consent on the registration form (Paul, 2026-10-04):
// tells them exactly what they agreed to, including the volunteer terms
// and disclaimer, and gives an urgent contact in case it wasn't them.
import { VOLUNTEER_INTERESTS } from "@/lib/registration";
import { VOLUNTEER_TERMS } from "@/lib/terms";
import { esc, shell } from "@/lib/homecare";

// Public contact details from the CAPS website (contact.html). Update here
// if the shelter wants a different number for urgent consent queries.
export const CAPS_URGENT_PHONE = "0401 530 516";
export const CAPS_INFO_EMAIL = "info@capeanimalprotectionshelter.org.au";

function dmy(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function parentConsentEmail(opts: {
  parentName: string;
  parentSignature: string;
  parentPhone: string;
  childName: string;
  childDob: string;
  activities: string[];
  wantsFoster: boolean;
  wantsJailBreak: boolean;
  imageConsent: boolean | null;
  signedOn: string;
}): { subject: string; text: string; html: string } {
  const labels = opts.activities.map((c) => VOLUNTEER_INTERESTS.find((i) => i.code === c)?.label ?? c);
  if (opts.wantsFoster) labels.push("Fostering (separate approval needed)");
  if (opts.wantsJailBreak) labels.push("Jail break program (separate approval needed)");
  const photos =
    opts.imageConsent === null ? "Not answered" : opts.imageConsent ? "Yes — photos may be used" : "No — photos must not be used";

  const subject = `Consent confirmed: ${opts.childName} volunteering with CAPS`;
  const urgent = `If this is not the case, please contact us urgently on ${CAPS_URGENT_PHONE} (or email ${CAPS_INFO_EMAIL}).`;

  const text = [
    `Dear ${opts.parentName},`,
    "",
    `This is to confirm that you have given consent for ${opts.childName} to volunteer with Cape Animal Protection Shelter Inc. (CAPS).`,
    "",
    urgent,
    "",
    "WHAT WAS SUBMITTED",
    `Volunteer: ${opts.childName} (born ${dmy(opts.childDob)})`,
    `Parent / guardian: ${opts.parentName}, ${opts.parentPhone}`,
    `Activities: ${labels.length ? labels.join(", ") : "None selected"}`,
    `Promotional photos: ${photos}`,
    `Consent given by typing the name: ${opts.parentSignature}`,
    `Date: ${dmy(opts.signedOn)}`,
    "",
    "THE VOLUNTEER TERMS AND DISCLAIMER AGREED TO",
    VOLUNTEER_TERMS,
    "",
    "Note: CAPS will confirm the registration before your child can start volunteering on site.",
    "",
    urgent,
  ].join("\n");

  const row = (k: string, v: string) =>
    `<tr><td style="padding:3px 12px 3px 0;color:#6B6B68;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`;
  const terms = VOLUNTEER_TERMS.split(/\n\s*\n/)
    .map((p) => `<p style="margin:6px 0">${esc(p)}</p>`)
    .join("");

  const html = shell(`
<h2 style="margin:0 0 12px">Consent confirmed</h2>
<p>Dear ${esc(opts.parentName)},</p>
<p>This is to confirm that you have given consent for <strong>${esc(opts.childName)}</strong> to volunteer with Cape Animal Protection Shelter Inc. (CAPS).</p>
<p style="background:#FEF3DC;border-radius:8px;padding:12px"><strong>${esc(urgent)}</strong></p>
<h3 style="margin:20px 0 6px">What was submitted</h3>
<table style="border-collapse:collapse;font-size:14px">
${row("Volunteer", `${opts.childName} (born ${dmy(opts.childDob)})`)}
${row("Parent / guardian", `${opts.parentName}, ${opts.parentPhone}`)}
${row("Activities", labels.length ? labels.join(", ") : "None selected")}
${row("Promotional photos", photos)}
${row("Consent given by typing", opts.parentSignature)}
${row("Date", dmy(opts.signedOn))}
</table>
<h3 style="margin:20px 0 6px">The volunteer terms and disclaimer agreed to</h3>
<div style="font-size:13px;border:1px solid #E0DDD6;border-radius:8px;padding:8px 12px">${terms}</div>
<p style="margin-top:16px">CAPS will confirm the registration before your child can start volunteering on site.</p>
<p>${esc(urgent)}</p>`);

  return { subject, text, html };
}
