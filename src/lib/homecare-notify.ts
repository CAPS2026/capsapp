// Notification + acknowledgement emails for a homecare application. Lives
// outside the "use server" action files on purpose: it uses the service-role
// client and must never be callable from the browser. Shared by public
// registration and the staff "add jail break / foster" form.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { DEFAULT_ADMIN_EMAIL, adminNotificationEmail, applicantAckEmail } from "@/lib/homecare";

export async function sendHomecareEmails(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  personId: string;
  firstName: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  experience: string | null;
  wantsFoster: boolean;
  wantsJailBreak: boolean;
  jailBreakRoleId: string | null;
}) {
  try {
    const { data: settings } = await opts.supabase
      .from("org_settings")
      .select("admin_notification_email")
      .maybeSingle();
    const adminEmail =
      (settings?.admin_notification_email as string | undefined)?.trim() || DEFAULT_ADMIN_EMAIL;

    let jailBreakApproveUrl: string | null = null;
    if (opts.wantsJailBreak && opts.jailBreakRoleId) {
      const { data: tok } = await opts.supabase
        .from("homecare_approval_tokens")
        .insert({ person_role_id: opts.jailBreakRoleId })
        .select("token")
        .single();
      if (tok?.token) jailBreakApproveUrl = `${siteUrl()}/approve/${tok.token}`;
    }

    const admin = adminNotificationEmail({
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      address: opts.address,
      experience: opts.experience,
      wantsFoster: opts.wantsFoster,
      wantsJailBreak: opts.wantsJailBreak,
      jailBreakApproveUrl,
      personUrl: `${siteUrl()}/people/${opts.personId}`,
    });
    const ack = applicantAckEmail({
      firstName: opts.firstName,
      wantsFoster: opts.wantsFoster,
      wantsJailBreak: opts.wantsJailBreak,
    });

    const [r1, r2] = await Promise.all([
      sendEmail({ to: adminEmail, subject: admin.subject, text: admin.text, html: admin.html }),
      sendEmail({ to: opts.email, subject: ack.subject, text: ack.text, html: ack.html }),
    ]);
    if (!r1.ok) console.error("homecare admin email failed:", r1.error);
    if (!r2.ok) console.error("homecare ack email failed:", r2.error);
  } catch (e) {
    console.error("sendHomecareEmails threw:", e);
  }
}
