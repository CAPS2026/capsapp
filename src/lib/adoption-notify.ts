// Adoption interest (Paul, 2026-10-05): someone ticks "Adoption" on the one
// public form. For now that records a pending `adopter` role on their record
// and emails CAPS (with a link to their page) plus a thank-you to them. The
// full adoption process (matching, visits, handover) is a later build. Not a
// "use server" file: it takes a service-role client and is only called from
// server actions that have done their own checks.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { DEFAULT_ADMIN_EMAIL, esc, shell } from "@/lib/homecare";

/** Adds a pending adopter role unless they already have one. Returns whether one was added. */
export async function addAdoptionInterest(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
): Promise<{ added: boolean; error?: string }> {
  const { data: existing, error: exErr } = await admin
    .from("person_roles")
    .select("id, status")
    .eq("person_id", personId)
    .eq("role", "adopter");
  if (exErr) return { added: false, error: exErr.message };

  const live = (existing ?? []).find((r) => r.status === "active" || r.status === "pending");
  if (live) return { added: false };

  const old = (existing ?? [])[0];
  if (old) {
    const { error } = await admin.from("person_roles").update({ status: "pending", ended_on: null }).eq("id", old.id);
    return error ? { added: false, error: error.message } : { added: true };
  }
  const { error } = await admin
    .from("person_roles")
    .insert({ person_id: personId, role: "adopter", status: "pending", granted_on: null });
  return error ? { added: false, error: error.message } : { added: true };
}

/** Best-effort notification to CAPS and a thank-you to the person. Never throws. */
export async function sendAdoptionEmails(
  admin: ReturnType<typeof createAdminClient>,
  p: { personId: string; firstName: string; name: string; email: string; phone: string },
): Promise<void> {
  try {
    const { data: settings } = await admin.from("org_settings").select("admin_notification_email").maybeSingle();
    const to = (settings?.admin_notification_email as string | undefined)?.trim() || DEFAULT_ADMIN_EMAIL;
    const link = `${siteUrl()}/people/${p.personId}`;

    const admin1 = await sendEmail({
      to,
      subject: `Adoption interest: ${p.name}`,
      text: [`${p.name} has said they're interested in adopting a CAPS dog or cat.`, "", `Email: ${p.email}`, `Phone: ${p.phone}`, "", `Their record: ${link}`].join("\n"),
      html: shell(
        `<p><strong>${esc(p.name)}</strong> has said they're interested in adopting a CAPS dog or cat.</p>
<p>Email: ${esc(p.email)}<br>Phone: ${esc(p.phone)}</p>
<p><a href="${esc(link)}">Open their record</a></p>`,
      ),
    });
    if (!admin1.ok) console.error("adoption admin email failed:", admin1.error);

    const ack = await sendEmail({
      to: p.email,
      subject: "Thanks for your interest in adopting from CAPS",
      text: [`Hi ${p.firstName},`, "", "Thanks for telling us you'd like to adopt. Someone from CAPS will be in touch to chat about the next steps.", "", "— CAPS"].join("\n"),
      html: shell(
        `<p>Hi ${esc(p.firstName)},</p><p>Thanks for telling us you'd like to adopt. Someone from CAPS will be in touch to chat about the next steps.</p>`,
      ),
    });
    if (!ack.ok) console.error("adoption ack email failed:", ack.error);
  } catch (e) {
    console.error("sendAdoptionEmails threw:", e);
  }
}
