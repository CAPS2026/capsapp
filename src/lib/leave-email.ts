// Leave request emails: the request itself (to Shayna and Renee, with a
// link to approve or decline) and the reply to the person who asked.
// Recipients come from org_settings.leave_request_email_recipients, never
// from this file.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, siteUrl } from "@/lib/email";
import { getLeaveContext } from "@/lib/leave-data";
import { LEAVE_SCOPE_LABEL, LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, formatLeaveDates, type LeaveRequestRow } from "@/lib/leave";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Emails the request to the leave recipients. Returns whether it was
 *  actually sent, so the screen can say so plainly (false when nobody is
 *  set up to receive it, or the send failed). */
export async function sendLeaveRequestEmail(
  sb: SupabaseClient,
  recipients: string[],
  req: LeaveRequestRow,
  token: string,
): Promise<boolean> {
  if (recipients.length === 0) return false;

  const { affected, overlapping } = await getLeaveContext(sb, req);
  const dates = formatLeaveDates(req.startDate, req.endDate);
  const link = `${siteUrl()}/approve/leave/${token}`;

  const text = [
    `${req.personName} has asked for leave.`,
    "",
    `Type: ${LEAVE_TYPE_LABEL[req.leaveType]}`,
    `Dates: ${dates}`,
    `Shifts: ${LEAVE_SCOPE_LABEL[req.scope]}`,
    `Reason: ${req.note ?? "None given"}`,
    "",
    affected.length ? "Rostered shifts this covers:" : "They are not rostered on any shift in this period.",
    ...affected.map((a) => `  - ${a}`),
    ...(overlapping.length ? ["", "Others also asking for or on leave in this period:", ...overlapping.map((o) => `  - ${o}`)] : []),
    "",
    `Approve or decline: ${link}`,
  ].join("\n");

  const list = (items: string[]) =>
    `<ul style="margin:4px 0 0;padding-left:20px;font-size:14px;line-height:1.6;">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

  const html = `<div style="font-family:sans-serif;max-width:520px;">
    <h2 style="color:#0F5A8F;">Leave request: ${esc(req.personName)}</h2>
    <div style="border:1px solid #E0DDD6;border-radius:10px;padding:14px;font-size:14px;line-height:1.7;">
      <b>Type:</b> ${esc(LEAVE_TYPE_LABEL[req.leaveType])}<br>
      <b>Dates:</b> ${esc(dates)}<br>
      <b>Shifts:</b> ${esc(LEAVE_SCOPE_LABEL[req.scope])}<br>
      <b>Reason:</b> ${esc(req.note ?? "None given")}
    </div>
    <p style="margin:14px 0 2px;font-weight:800;font-size:14px;">${affected.length ? "Rostered shifts this covers" : "Not rostered on any shift in this period"}</p>
    ${affected.length ? list(affected) : ""}
    ${overlapping.length ? `<p style="margin:14px 0 2px;font-weight:800;font-size:14px;">Others also asking for or on leave</p>${list(overlapping)}` : ""}
    <p style="margin:20px 0;"><a href="${link}" style="background:#1A7ABF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:800;">Review and decide</a></p>
    <p style="font-size:12px;color:#6B6B68;">You can also approve or decline from the Leave tab in the CAPS Staff app.</p>
  </div>`;

  const result = await sendEmail({
    to: recipients,
    subject: `Leave request: ${req.personName}, ${dates}`,
    text,
    html,
  });
  if (!result.ok) console.error("sendLeaveRequestEmail: send failed", result.error);
  return result.ok;
}

/** Tells the person their request was approved or declined. Best-effort:
 *  needs an email address on their profile. */
export async function sendLeaveDecisionEmail(to: string | null, req: LeaveRequestRow): Promise<void> {
  if (!to) return;
  const dates = formatLeaveDates(req.startDate, req.endDate);
  const verdict = LEAVE_STATUS_LABEL[req.status].toLowerCase();
  const text = `Your ${LEAVE_TYPE_LABEL[req.leaveType].toLowerCase()} request for ${dates} (${LEAVE_SCOPE_LABEL[req.scope].toLowerCase()}) was ${verdict}.${
    req.decisionNote ? `\n\nMessage: ${req.decisionNote}` : ""
  }`;
  const result = await sendEmail({
    to,
    subject: `Your leave request was ${verdict}`,
    text,
    html: `<div style="font-family:sans-serif;max-width:520px;font-size:14px;line-height:1.6;">
      <h2 style="color:#0F5A8F;">Leave request ${verdict}</h2>
      <p>${esc(LEAVE_TYPE_LABEL[req.leaveType])}, ${esc(dates)} (${esc(LEAVE_SCOPE_LABEL[req.scope].toLowerCase())}).</p>
      ${req.decisionNote ? `<p><b>Message:</b> ${esc(req.decisionNote)}</p>` : ""}
    </div>`,
  });
  if (!result.ok) console.error("sendLeaveDecisionEmail: send failed", result.error);
}
