// The end-of-shift email: one per session (date + part), covering
// everyone who worked it, sent once the last open shift on that session
// closes (see maybeSendShiftEmail, called from endShift and from the
// auto-close check). Recipients come from
// org_settings.staff_shift_email_recipients, never from this file.

import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { PART_LABEL, CATEGORY_LABEL, parseYmd, type Part } from "@/lib/shift";
import {
  autocloseStaleShifts,
  ensureRosterSession,
  getSessionShifts,
  getSessionTasks,
  getShiftEmailRecipients,
  getShiftSettings,
  hasOpenShiftsForSession,
  type SessionShiftRow,
  type SessionTasksRow,
} from "@/lib/shift-data";

type PersonBlock = {
  name: string;
  startedAt: string;
  endedAt: string | null;
  flags: string[];
  done: string[];
  notNeeded: string[];
  claimedNotDone: string[];
  extraDone: string[];
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function buildBlocks(shifts: SessionShiftRow[], tasks: SessionTasksRow[], radiusM: number): {
  people: PersonBlock[];
  unclaimed: string[];
} {
  const people = new Map<string, PersonBlock>();
  for (const s of shifts) {
    const flags: string[] = [];
    if (s.lateMinutes) flags.push(`Signed in ${s.lateMinutes} min after the rostered start${s.lateReason ? `: ${s.lateReason}` : ", no reason given"}`);
    if (s.distanceM != null && s.distanceM > radiusM) flags.push(`Signed in ${(s.distanceM / 1000).toFixed(1)}km from the shelter`);
    if (s.autoClosed) flags.push("Shift closed automatically, no manual sign-out");
    people.set(s.personName, {
      name: s.personName,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      flags,
      done: [],
      notNeeded: [],
      claimedNotDone: [],
      extraDone: [],
    });
  }

  const unclaimed: string[] = [];
  for (const t of tasks) {
    const label = t.category ? `${t.title} (${CATEGORY_LABEL[t.category]})` : t.title;
    if (t.status === "done" && t.actionedByName) {
      const p = people.get(t.actionedByName);
      if (p) (t.isExtra ? p.extraDone : p.done).push(label);
    } else if (t.status === "not_required" && t.actionedByName) {
      const p = people.get(t.actionedByName);
      if (p) p.notNeeded.push(`${label}${t.note ? `: ${t.note}` : ""}`);
    } else if (t.status === "open" && t.claimedByName) {
      const p = people.get(t.claimedByName);
      if (p) p.claimedNotDone.push(label);
    } else if (t.status === "open") {
      unclaimed.push(t.isExtra ? `${label} (extra)` : label);
    }
  }

  return { people: [...people.values()], unclaimed };
}

function textBody(date: string, part: Part, blocks: ReturnType<typeof buildBlocks>): string {
  const day = parseYmd(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const lines = [`${PART_LABEL[part]} shift, ${day}`, ""];

  for (const p of blocks.people) {
    lines.push(`${p.name} (signed in ${timeLabel(p.startedAt)}${p.endedAt ? `, out ${timeLabel(p.endedAt)}` : ", still signed in"})`);
    for (const f of p.flags) lines.push(`  ! ${f}`);
    if (p.done.length) lines.push(`  Done: ${p.done.join(", ")}`);
    if (p.notNeeded.length) lines.push(`  Not needed: ${p.notNeeded.join(", ")}`);
    if (p.claimedNotDone.length) lines.push(`  Claimed, not done: ${p.claimedNotDone.join(", ")}`);
    if (p.extraDone.length) lines.push(`  Extra, off the checklist: ${p.extraDone.join(", ")}`);
    lines.push("");
  }

  if (blocks.unclaimed.length) {
    lines.push("Not done, nobody claimed it:");
    lines.push(`  ${blocks.unclaimed.join(", ")}`);
  }

  return lines.join("\n");
}

function htmlBody(date: string, part: Part, blocks: ReturnType<typeof buildBlocks>): string {
  const day = parseYmd(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const person = (p: PersonBlock) => `
    <div style="border:1px solid #E0DDD6;border-radius:10px;padding:14px;margin-bottom:12px;">
      <p style="margin:0 0 6px;font-weight:800;color:#2C2C2A;">
        ${esc(p.name)} <span style="font-weight:600;color:#6B6B68;font-size:13px;">
          signed in ${timeLabel(p.startedAt)}${p.endedAt ? `, out ${timeLabel(p.endedAt)}` : ", still signed in"}
        </span>
      </p>
      ${p.flags.map((f) => `<p style="margin:4px 0;color:#C1800F;font-size:13px;">${esc(f)}</p>`).join("")}
      ${p.done.length ? `<p style="margin:6px 0 0;font-size:14px;"><b>Done:</b> ${esc(p.done.join(", "))}</p>` : ""}
      ${p.notNeeded.length ? `<p style="margin:6px 0 0;font-size:14px;"><b>Not needed:</b> ${esc(p.notNeeded.join(", "))}</p>` : ""}
      ${p.claimedNotDone.length ? `<p style="margin:6px 0 0;font-size:14px;"><b>Claimed, not done:</b> ${esc(p.claimedNotDone.join(", "))}</p>` : ""}
      ${p.extraDone.length ? `<p style="margin:6px 0 0;font-size:14px;"><b>Extra, off the checklist:</b> ${esc(p.extraDone.join(", "))}</p>` : ""}
    </div>`;

  const unclaimed = blocks.unclaimed.length
    ? `<div style="border:1px solid #F0D69A;background:#FEF3DC;border-radius:10px;padding:14px;">
        <p style="margin:0;font-size:14px;"><b>Not done, nobody claimed it:</b> ${esc(blocks.unclaimed.join(", "))}</p>
      </div>`
    : "";

  return `
    <div style="font-family:sans-serif;max-width:520px;">
      <h2 style="font-family:sans-serif;color:#0F5A8F;">${PART_LABEL[part]} shift, ${day}</h2>
      ${blocks.people.map(person).join("")}
      ${unclaimed}
    </div>`;
}

/** Sends the summary for (date, part) if, and only if, every shift
 *  against that session is closed, at least one person signed in, there
 *  are recipients configured, and it hasn't already gone out. Safe to
 *  call speculatively (e.g. after every sign-out and every auto-close);
 *  it's a no-op otherwise. */
export async function maybeSendShiftEmail(date: string, part: Part): Promise<void> {
  const session = await ensureRosterSession(date, part);
  if (session.emailSentAt) return;
  if (await hasOpenShiftsForSession(date, part)) return;

  const shifts = await getSessionShifts(date, part);
  if (shifts.length === 0) return;

  const recipients = await getShiftEmailRecipients();
  if (recipients.length === 0) return;

  const [tasks, { radiusM }] = await Promise.all([getSessionTasks(date, part), getShiftSettings()]);
  const blocks = buildBlocks(shifts, tasks, radiusM);

  const day = parseYmd(date).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const result = await sendEmail({
    to: recipients,
    subject: `CAPS ${PART_LABEL[part]} shift, ${day}`,
    text: textBody(date, part, blocks),
    html: htmlBody(date, part, blocks),
  });

  if (result.ok) {
    const supabase = await createClient();
    await supabase.from("roster_session").update({ email_sent_at: new Date().toISOString() }).eq("id", session.id);
  } else {
    console.error("maybeSendShiftEmail: send failed", result.error);
  }
}

/** Call this wherever the staff app loads (no scheduled job behind it
 *  yet, see docs/staff-app-plan.md). Closes any abandoned shift and
 *  sends the summary email for any session that completes as a result.
 *  Best-effort: never throws, so a page render never breaks over it. */
export async function checkAutoCloseAndSendEmails(): Promise<void> {
  try {
    const closedSessions = await autocloseStaleShifts();
    for (const { date, part } of closedSessions) {
      await maybeSendShiftEmail(date, part);
    }
  } catch (e) {
    console.error("checkAutoCloseAndSendEmails failed", e);
  }
}
