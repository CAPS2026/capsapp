"use server";

// Add / Edit / Remove staff inside the staff app (admin only). Replaces the
// dog app's "Add staff member" page for staff purposes; nothing here is
// imported from the dog app (copied where needed, so the two stay separate).
//
// Logins: the app signs people in with a code sent to their email, and it
// deliberately never creates a login for an unknown email. So adding
// someone here also creates their login (Supabase Auth, service role), and
// emails them how to sign in. Removing someone ends their roles and switches
// their login off, but keeps their history (shifts, ticks, leave), which a
// delete would wipe.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { shelterToday } from "@/lib/shift";
import type { StaffRole } from "@/lib/shift-people-data";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES: StaffRole[] = ["staff", "admin", "volunteer"];

export type StaffInput = {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  ecName: string;
  ecPhone: string;
  ecRelationship: string;
  ecEmail: string;
  medicalIssues: string;
  roles: Record<StaffRole, boolean>;
};

/** What happened with their login, said plainly on screen. */
export type LoginOutcome = { loginReady: boolean; emailed: boolean; problem?: string };

async function requireAdmin() {
  const me = await getCurrentPerson();
  return me?.isAdmin && me.id ? me : null;
}

function bust() {
  revalidatePath("/shift/staff");
  revalidatePath("/shift/roster");
  revalidatePath("/shift");
}

/** Checks and tidies the form. Returns an error message, or the clean values. */
function clean(input: StaffInput): { error: string } | { value: StaffInput & { email: string } } {
  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  if (!firstName || !surname) return { error: "First name and surname are required." };
  const email = input.email.trim().toLowerCase();
  if (!email) return { error: "Email is required. It's how they sign in." };
  if (!EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (phone && (digits.length < 8 || digits.length > 15)) return { error: "That phone number doesn't look right." };
  const ecEmail = input.ecEmail.trim().toLowerCase();
  if (ecEmail && !EMAIL_RE.test(ecEmail)) return { error: "The emergency contact email doesn't look right." };
  if (!ROLES.some((r) => input.roles[r])) return { error: "Pick at least one role." };
  return {
    value: {
      ...input,
      firstName,
      surname,
      email,
      phone,
      ecEmail,
      address: input.address.trim(),
      ecName: input.ecName.trim(),
      ecPhone: input.ecPhone.trim(),
      ecRelationship: input.ecRelationship.trim(),
      medicalIssues: input.medicalIssues.trim(),
    },
  };
}

function peopleRow(v: StaffInput & { email: string }) {
  return {
    first_name: v.firstName,
    surname: v.surname,
    email: v.email,
    phone: v.phone || null,
    date_of_birth: v.dateOfBirth || null,
    address: v.address || null,
    ec_name: v.ecName || null,
    ec_phone: v.ecPhone || null,
    ec_relationship: v.ecRelationship || null,
    ec_email: v.ecEmail || null,
  };
}

/** The login (Supabase Auth user) for an email, if there is one. */
async function findLogin(email: string): Promise<{ id: string; banned: boolean } | null> {
  const admin = createAdminClient();
  const want = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = data.users.find((x) => x.email?.toLowerCase() === want);
    if (u) {
      const until = (u as { banned_until?: string | null }).banned_until;
      return { id: u.id, banned: !!until && new Date(until).getTime() > Date.now() };
    }
    if (data.users.length < 200) break;
  }
  return null;
}

/** Makes sure this email has a working login (creating it, or switching it
 *  back on if they were removed before), then emails them how to sign in. */
async function setUpLoginFor(email: string, firstName: string): Promise<LoginOutcome> {
  const admin = createAdminClient();
  const existing = await findLogin(email);
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) return { loginReady: false, emailed: false, problem: error.message };
  } else if (existing.banned) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { ban_duration: "none" });
    if (error) return { loginReady: false, emailed: false, problem: error.message };
  }

  const link = `${siteUrl()}/login?next=/shift`;
  const steps = [
    `1. Go to ${link}`,
    `2. Type this email address: ${email}`,
    "3. You'll be emailed a code. Type it in and you're signed in.",
  ];
  const result = await sendEmail({
    to: email,
    subject: "Your CAPS Staff app login",
    text: [`Hi ${firstName},`, "", "You've been set up on the CAPS Staff app. To sign in:", "", ...steps].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:520px;font-size:14px;">
      <p>Hi ${firstName.replace(/</g, "&lt;")},</p>
      <p>You've been set up on the CAPS Staff app. To sign in:</p>
      <ol>
        <li>Go to <a href="${link}">${link}</a></li>
        <li>Type this email address: <b>${email}</b></li>
        <li>You'll be emailed a code. Type it in and you're signed in.</li>
      </ol>
    </div>`,
  });
  if (!result.ok) console.error("setUpLoginFor: welcome email failed", result.error);
  return { loginReady: true, emailed: result.ok };
}

/** Gives or ends each of this screen's roles so they match `want`. A role
 *  that ends is marked exited (kept as history), never deleted. */
async function applyRoles(personId: string, want: Record<StaffRole, boolean>, approvedBy: string): Promise<string | null> {
  const supabase = await createClient();
  const today = shelterToday();
  const { data: current } = await supabase.from("person_roles").select("role, status").eq("person_id", personId);
  const active = new Set(
    ((current ?? []) as Array<{ role: string; status: string }>).filter((r) => r.status === "active").map((r) => r.role),
  );
  const known = new Set(((current ?? []) as Array<{ role: string }>).map((r) => r.role));

  for (const role of ROLES) {
    if (want[role] && !active.has(role)) {
      const { error } = known.has(role)
        ? await supabase
            .from("person_roles")
            .update({ status: "active", ended_on: null, granted_on: today, approved_by: approvedBy })
            .eq("person_id", personId)
            .eq("role", role)
        : await supabase
            .from("person_roles")
            .insert({ person_id: personId, role, status: "active", granted_on: today, approved_by: approvedBy });
      if (error) return error.message;
    } else if (!want[role] && active.has(role)) {
      const { error } = await supabase
        .from("person_roles")
        .update({ status: "exited", ended_on: today })
        .eq("person_id", personId)
        .eq("role", role);
      if (error) return error.message;
    }
  }
  return null;
}

async function saveMedical(personId: string, medical: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("volunteer_profile").select("person_id").eq("person_id", personId).maybeSingle();
  if (!medical && !existing) return null;
  const { error } = existing
    ? await supabase.from("volunteer_profile").update({ medical_issues: medical || null }).eq("person_id", personId)
    : await supabase.from("volunteer_profile").insert({ person_id: personId, medical_issues: medical });
  return error ? error.message : null;
}

/** Add a staff member: their details, roles, and a login with an email
 *  telling them how to sign in. */
export async function addStaffMember(
  input: StaffInput,
): Promise<{ error: string } | { error?: undefined; id: string; login: LoginOutcome }> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const c = clean(input);
  if ("error" in c) return c;
  const v = c.value;

  const supabase = await createClient();
  const { data: person, error } = await supabase.from("people").insert(peopleRow(v)).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "Someone already has that email address." };
    return { error: error.message };
  }

  const roleErr = await applyRoles(person.id, v.roles, me.id);
  if (roleErr) return { error: roleErr };
  const medErr = await saveMedical(person.id, v.medicalIssues);
  if (medErr) return { error: medErr };

  const login = await setUpLoginFor(v.email, v.firstName);
  bust();
  return { id: person.id, login };
}

/** Save changes to someone's details and roles. A changed email also moves
 *  their login to the new address, so they sign in with the new one. */
export async function updateStaffMember(id: string, input: StaffInput): Promise<{ error?: string }> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const c = clean(input);
  if ("error" in c) return c;
  const v = c.value;
  if (id === me.id && !v.roles.admin) return { error: "You can't take away your own admin role." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("people").select("email").eq("id", id).maybeSingle();
  if (!before) return { error: "That person wasn't found." };
  const oldEmail = String(before.email ?? "").toLowerCase();

  if (oldEmail && oldEmail !== v.email) {
    const login = await findLogin(oldEmail);
    if (login) {
      const { error } = await createAdminClient().auth.admin.updateUserById(login.id, { email: v.email, email_confirm: true });
      if (error) return { error: `Couldn't move their login to the new email: ${error.message}` };
    }
  }

  const { error } = await supabase.from("people").update(peopleRow(v)).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Someone else already has that email address." };
    return { error: error.message };
  }

  const roleErr = await applyRoles(id, v.roles, me.id);
  if (roleErr) return { error: roleErr };
  const medErr = await saveMedical(id, v.medicalIssues);
  if (medErr) return { error: medErr };

  bust();
  return {};
}

/** For someone already in the app who has no login yet (or whose welcome
 *  email needs sending again): creates it if needed and emails them. */
export async function sendLoginInvite(id: string): Promise<{ error: string } | { error?: undefined; login: LoginOutcome }> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const supabase = await createClient();
  const { data: p } = await supabase.from("people").select("first_name, email").eq("id", id).maybeSingle();
  if (!p?.email) return { error: "They need an email address first." };
  const login = await setUpLoginFor(String(p.email).toLowerCase(), p.first_name);
  bust();
  return { login };
}

/** Remove someone from the staff app: their Caretaker, Admin and Volunteer
 *  roles end, and their login is switched off unless they still have
 *  another role in the dog app (a foster carer, say). Their history stays.
 *  Future roster slots are NOT cleared: the screen lists them first, so an
 *  admin can re-roster those shifts. */
export async function removeStaffMember(id: string): Promise<{ error?: string; loginOff?: boolean }> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  if (id === me.id) return { error: "You can't remove yourself." };

  const supabase = await createClient();
  const { data: p } = await supabase.from("people").select("email").eq("id", id).maybeSingle();
  if (!p) return { error: "That person wasn't found." };

  const roleErr = await applyRoles(id, { staff: false, admin: false, volunteer: false }, me.id);
  if (roleErr) return { error: roleErr };

  const { data: remaining } = await supabase.from("person_roles").select("role").eq("person_id", id).eq("status", "active");
  let loginOff = false;
  if ((remaining ?? []).length === 0 && p.email) {
    const login = await findLogin(String(p.email));
    if (login && !login.banned) {
      const { error } = await createAdminClient().auth.admin.updateUserById(login.id, { ban_duration: "876000h" });
      if (error) return { error: `Roles ended, but their login couldn't be switched off: ${error.message}` };
      loginOff = true;
    }
  }

  bust();
  return { loginOff };
}
