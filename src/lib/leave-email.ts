// Leave request emails. The request goes to the DECIDERS (Shayna) with a
// link to approve or decline, and to the INFORMED list (Renee) as a copy
// for information with no link. When it is decided, the person who asked
// is emailed (a backup: the answer also shows in the app) and the informed
// list gets a short note. Recipients come from org_settings
// (leave_decider_emails, leave_inform_emails), never from this file.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, siteUrl } from "@/lib/email";
import { getLeaveContext } from "@/lib/leave-data";
import { LEAVE_SCOPE_LABEL, formatLeaveDates, type LeaveRequestRow } from "@/lib/leave";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const VERB: Record<LeaveRequestRow["status"], string> = {
  pending: "pending",
  approved: "approved",
  declined: "declined",
  cancelled: "cancelled",
};

/** Emails the request. Returns whether the DECIDERS were actually emailed,
 *  so the screen can say so plainly (false when nobody is set up to decide,
 *  or the send failed). The informed list gets its copy best-effort. */
export async function sendLeaveRequestEmail(
  sb: SupabaseClient,
  recipients: { deciders: string[]; informed: string[] },
  req: LeaveRequestRow,
  token: string,
): Promise<boolean> {
  if (recipients.deciders.length === 0) return false;

  const { affected, overlapping } = await getLeaveContext(sb, req);
  const dates = formatLeaveDates(req.startDate, req.endDate);
  const link = `${siteUrl()}/approve/leave/${token}`;

  const details = [
    `${req.personName} has asked for leave.`,
    "",
    `Dates: ${dates}`,
    `Shifts: ${LEAVE_SCOPE_LABEL[req.scope]}`,
    `Reason: ${req.note ?? "None given"}`,
    "",
    affected.length ? "Rostered shifts this covers:" : "They are not rostered on any shift in this period.",
    ...affected.map((a) => `  - ${a}`),
    ...(overlapping.length ? ["", "Others also asking for or on leave in this period:", ...overlapping.map((o) => `  - ${o}`)] : []),
  ];

  const list = (items: string[]) =>
    `<ul style="margin:4px 0 0;padding-left:20px;font-size:14px;line-height:1.6;">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

  const body = `
    <div style="border:1px solid #E0DDD6;border-radius:10px;padding:14px;font-size:14px;line-height:1.7;">
      <b>Dates:</b> ${esc(dates)}<br>
      <b>Shifts:</b> ${esc(LEAVE_SCOPE_LABEL[req.scope])}<br>
      <b>Reason:</b> ${esc(req.note ?? "None given")}
    </div>
    <p style="margin:14px 0 2px;font-weight:800;font-size:14px;">${affected.length ? "Rostered shifts this covers" : "Not rostered on any shift in this period"}</p>
    ${affected.length ? list(affected) : ""}
    ${overlapping.length ? `<p style="margin:14px 0 2px;font-weight:800;font-size:14px;">Others also asking for or on leave</p>${list(overlapping)}` : ""}`;

  const subject = `Leave request: ${req.personName}, ${dates}`;

  // The people who decide: with the Approve / Decline link.
  const result = await sendEmail({
    to: recipients.deciders,
    subject,
    text: [...details, "", `Approve or decline: ${link}`].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:520px;">
      <h2 style="color:#0F5A8F;">Leave request: ${esc(req.personName)}</h2>
      ${body}
      <p style="margin:20px 0;"><a href="${link}" style="background:#1A7ABF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:800;">Review and decide</a></p>
    </div>`,
  });
  if (!result.ok) console.error("sendLeaveRequestEmail: send failed", result.error);

  // The people who are only informed: same details, no link, no action.
  if (result.ok && recipients.informed.length > 0) {
    const copy = await sendEmail({
      to: recipients.informed,
      subject: `For information: ${subject}`,
      text: [...details, "", "For your information only. No action needed from you."].join("\n"),
      html: `<div style="font-family:sans-serif;max-width:520px;">
        <h2 style="color:#0F5A8F;">Leave request: ${esc(req.personName)}</h2>
        <p style="font-size:14px;color:#6B6B68;">For your information only. No action needed from you.</p>
        ${body}
      </div>`,
    });
    if (!copy.ok) console.error("sendLeaveRequestEmail: informed copy failed", copy.error);
  }

  return result.ok;
}

/** Tells the person their request was decided (or cancelled), and tells the
 *  informed list. Best-effort: the person needs an email address on their
 *  profile, and the answer also shows in the app either way. */
export async function sendLeaveDecisionEmails(
  to: string | null,
  informed: string[],
  req: LeaveRequestRow,
): Promise<void> {
  const dates = formatLeaveDates(req.startDate, req.endDate);
  const verb = VERB[req.status];

  if (to) {
    const result = await sendEmail({
      to,
      subject: `Your leave request was ${verb}`,
      text: `Your leave request for ${dates} (${LEAVE_SCOPE_LABEL[req.scope].toLowerCase()}) was ${verb}.${
        req.decisionNote ? `\n\nMessage: ${req.decisionNote}` : ""
      }`,
      html: `<div style="font-family:sans-serif;max-width:520px;font-size:14px;line-height:1.6;">
        <h2 style="color:#0F5A8F;">Leave request ${verb}</h2>
        <p>${esc(dates)} (${esc(LEAVE_SCOPE_LABEL[req.scope].toLowerCase())}).</p>
        ${req.decisionNote ? `<p><b>Message:</b> ${esc(req.decisionNote)}</p>` : ""}
      </div>`,
    });
    if (!result.ok) console.error("sendLeaveDecisionEmails: staff send failed", result.error);
  }

  if (informed.length > 0) {
    const result = await sendEmail({
      to: informed,
      subject: `${req.personName}'s leave was ${verb}`,
      text: `${req.personName}'s leave for ${dates} (${LEAVE_SCOPE_LABEL[req.scope].toLowerCase()}) was ${verb}.`,
    });
    if (!result.ok) console.error("sendLeaveDecisionEmails: informed send failed", result.error);
  }
}
