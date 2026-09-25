// The end-of-shift email: one per session (date + part), covering
// everyone who worked it, sent once the session's finish time has passed
// and the last open shift on it has closed (see maybeSendShiftEmail, called
// from endShift, the auto-close check and the scheduled checks). Recipients come from
// org_settings.staff_shift_email_recipients, never from this file.
//
// It lists: what each person did, whether they were late, finished early
// or stayed on, every task still outstanding, the handover log entries
// and any health concerns raised. (Health concerns are also emailed the
// moment they are raised, see sendHealthConcernEmail.)

import { sendEmail } from "@/lib/email";
import { shiftDb } from "@/lib/shift-db";
import {
  PART_LABEL,
  CATEGORY_LABEL,
  SHELTER_TZ,
  clock12,
  parseYmd,
  sessionInstant,
  shelterToday,
  shiftDay,
  time12,
  type Part,
} from "@/lib/shift";
import {
  autocloseStaleShifts,
  ensureRosterSession,
  getHealthConcernRecipients,
  getSessionHandover,
  getSessionHealthConcerns,
  getSessionShifts,
  getSessionTasks,
  getShiftEmailRecipients,
  getShiftSettings,
  getUnattendedSessions,
  hasOpenShiftsForSession,
  type SessionHandoverRow,
  type SessionHealthConcern,
  type SessionShiftRow,
  type SessionTasksRow,
} from "@/lib/shift-data";

export type PersonBlock = {
  name: string;
  /** Null for someone who ticked tasks but never signed in to this session. */
  startedAt: string | null;
  endedAt: string | null;
  /** Plain-English lines: on time or late, full shift or early, overtime. */
  status: string[];
  /** Things worth attention (off site, covering, closed automatically). */
  flags: string[];
  done: string[];
  notNeeded: string[];
  extraDone: string[];
};

export type EmailPreview = {
  date: string;
  part: Part;
  people: PersonBlock[];
  outstanding: string[];
  handover: SessionHandoverRow[];
  health: SessionHealthConcern[];
  /** False when nobody's configured to receive it (so preview still works). */
  hasRecipients: boolean;
};

type Built = Pick<EmailPreview, "people" | "outstanding" | "handover" | "health">;

function timeLabel(iso: string) {
  return clock12(iso);
}

function dayShort(date: string) {
  return parseYmd(date).toLocaleDateString("en-AU", { weekday: "short" });
}

/** "Fri 26 Sept, 7:10am", shelter time, for a moment that may not be on
 *  the shift's own day. */
function whenLabel(iso: string) {
  const day = new Date(iso).toLocaleDateString("en-AU", {
    timeZone: SHELTER_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day}, ${clock12(iso)}`;
}

/** The status lines for one person's shift: late or on time, full shift
 *  or finished early, any overtime. `graceMin` is the same grace period
 *  the app uses everywhere (10 minutes), inside which nothing is flagged. */
function statusLines(s: SessionShiftRow, graceMin: number): string[] {
  const lines: string[] = [];

  // Nobody signed in at the time; the shift was typed in afterwards. Say so
  // plainly, with the times they gave, rather than judging it like a live
  // sign-in (there was no sign-in to be late for, or early out of).
  if (s.enteredAfterwardsReason) {
    lines.push(
      `Did not sign in at the time. Shift entered afterwards (${whenLabel(s.createdAt)}), reason: ${s.enteredAfterwardsReason}`,
    );
    if (s.lateMinutes && s.lateMinutes > graceMin) lines.push(`Started ${s.lateMinutes} min after the rostered start`);
    if (s.endedAt) {
      const endsAt = sessionInstant(s.date, s.sessionEnds).getTime();
      const diff = Math.round((new Date(s.endedAt).getTime() - endsAt) / 60000);
      if (diff < -graceMin) lines.push(`Finished ${-diff} min before the rostered end`);
      else if (diff > graceMin) lines.push(`Finished ${diff} min after the rostered end`);
    }
    return lines;
  }

  if (s.lateMinutes && s.lateMinutes > graceMin) {
    lines.push(
      `Late: signed in ${s.lateMinutes} min after the rostered start${s.lateReason ? `, reason: ${s.lateReason}` : ", no reason given"}`,
    );
  } else {
    lines.push("On time");
  }

  if (s.reopenedAt) {
    lines.push(`Shift closed automatically, then reopened at ${timeLabel(s.reopenedAt)} because they were still working`);
  }

  if (!s.endedAt) {
    lines.push("Still signed in");
    return lines;
  }

  const endsAt = sessionInstant(s.date, s.sessionEnds).getTime();
  const extended = (s.extendedMinutes ?? 0) * 60000;
  const out = new Date(s.endedAt).getTime();

  if (s.extendedMinutes) {
    lines.push(
      `Stayed ${s.extendedMinutes} min past the rostered end${s.extendedReason ? `, reason: ${s.extendedReason}` : ""}`,
    );
  }
  if (s.autoClosed) {
    lines.push(
      s.reopenedAt
        ? "Shift closed automatically at their last activity, no manual sign-out"
        : "Shift closed automatically at the rostered end, no manual sign-out",
    );
  } else {
    const earlyMin = Math.round((endsAt + extended - out) / 60000);
    if (earlyMin > graceMin) {
      lines.push(`Finished ${earlyMin} min early${s.endedEarlyReason ? `, reason: ${s.endedEarlyReason}` : ", no reason given"}`);
    } else if (!s.extendedMinutes) {
      const overMin = Math.round((out - endsAt) / 60000);
      lines.push(
        overMin > graceMin ? `Full shift, then stayed ${overMin} min past the rostered end (not logged as overtime)` : "Full shift",
      );
    } else {
      lines.push("Full shift");
    }
  }
  return lines;
}

/** A completed task's line in the email. A task from an earlier shift, or
 *  one ticked well after this shift finished, says so and when it was
 *  ticked, so a morning task ticked at 3:49pm never reads as if it was done
 *  on time by the afternoon shift. */
function doneLabel(t: SessionTasksRow, date: string, endsAtMs: number, graceMin: number): string {
  const note = t.status === "not_required" && t.note ? `: ${t.note}` : "";
  if (!t.actionedAt) return `${t.title}${note}`;
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone: SHELTER_TZ }).format(new Date(t.actionedAt)) === date;
  const when = sameDay ? clock12(t.actionedAt) : whenLabel(t.actionedAt);
  if (t.carriedOver) {
    const origin = t.date === date ? `${t.part} task` : `${dayShort(t.date)} ${t.part} task`;
    return `${t.title} (${origin}, ticked at ${when})${note}`;
  }
  if (new Date(t.actionedAt).getTime() > endsAtMs + graceMin * 60000) {
    return `${t.title} (ticked at ${when}, after the shift)${note}`;
  }
  return `${t.title}${note}`;
}

function buildBlocks(
  date: string,
  shifts: SessionShiftRow[],
  tasks: SessionTasksRow[],
  handover: SessionHandoverRow[],
  health: SessionHealthConcern[],
  radiusM: number,
  graceMin: number,
  endsAtMs: number,
): Built {
  const people = new Map<string, PersonBlock>();
  for (const s of shifts) {
    const flags: string[] = [];
    if (!s.rostered) flags.push("Covering, not on the roster");
    if (s.distanceM != null && s.distanceM > radiusM) flags.push(`Signed in ${(s.distanceM / 1000).toFixed(1)}km from the shelter`);
    const existing = people.get(s.personName);
    if (existing) {
      // The same person signed in twice in one session: one block, both
      // sets of lines, rather than the second wiping out the first.
      existing.status.push(...statusLines(s, graceMin));
      existing.flags.push(...flags);
      existing.endedAt = s.endedAt;
      continue;
    }
    people.set(s.personName, {
      name: s.personName,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: statusLines(s, graceMin),
      flags,
      done: [],
      notNeeded: [],
      extraDone: [],
    });
  }

  const blockFor = (name: string): PersonBlock => {
    let p = people.get(name);
    if (!p) {
      p = { name, startedAt: null, endedAt: null, status: [], flags: [], done: [], notNeeded: [], extraDone: [] };
      people.set(name, p);
    }
    return p;
  };

  // Completed tasks are just the task, one per line under the person who
  // did it. Outstanding ones carry their section, whether they came from an
  // earlier shift, and who (if anyone) had claimed them.
  const outstanding: string[] = [];
  for (const t of tasks) {
    if (t.status === "done" && t.actionedByName) {
      (t.isExtra ? blockFor(t.actionedByName).extraDone : blockFor(t.actionedByName).done).push(
        doneLabel(t, date, endsAtMs, graceMin),
      );
    } else if (t.status === "not_required" && t.actionedByName) {
      blockFor(t.actionedByName).notNeeded.push(doneLabel(t, date, endsAtMs, graceMin));
    } else if (t.status === "open") {
      const from = t.carriedOver ? `, from ${t.date === date ? "this morning" : dayShort(t.date)}` : "";
      const claim = t.claimedByName ? `, claimed by ${t.claimedByName}` : "";
      const detail = `${from}${claim}`.replace(/^, /, "");
      const label = t.category
        ? `${t.title} (${CATEGORY_LABEL[t.category]}${from}${claim})`
        : t.isExtra
          ? `${t.title} (extra${from}${claim})`
          : detail
            ? `${t.title} (${detail})`
            : t.title;
      outstanding.push(label);
    }
  }

  return { people: [...people.values()], outstanding, handover, health };
}

function textBody(date: string, part: Part, b: Built, updateNote?: string): string {
  const day = parseYmd(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const lines = [...(updateNote ? [updateNote, ""] : []), `${PART_LABEL[part]} shift, ${day}`, ""];

  if (b.health.length) {
    lines.push("HEALTH CONCERNS");
    for (const h of b.health) {
      lines.push(`  ${h.urgent ? "URGENT: " : ""}${h.dogName ? `${h.dogName}: ` : ""}${h.body} (${h.personName}, ${timeLabel(h.createdAt)})`);
    }
    lines.push("");
  }

  for (const p of b.people) {
    lines.push(
      p.startedAt
        ? `${p.name} (signed in ${timeLabel(p.startedAt)}${p.endedAt ? `, out ${timeLabel(p.endedAt)}` : ", still signed in"})`
        : `${p.name} (not signed in to this shift)`,
    );
    for (const s of p.status) lines.push(`  ${s}`);
    for (const f of p.flags) lines.push(`  ! ${f}`);
    const list = (heading: string, items: string[]) => {
      if (!items.length) return;
      lines.push("", `  ${heading} (${items.length})`);
      for (const i of items) lines.push(`    - ${i}`);
    };
    list("Tasks completed", p.done);
    list("Not needed", p.notNeeded);
    list("Extra tasks, off the checklist", p.extraDone);
    if (!p.done.length && !p.notNeeded.length && !p.extraDone.length) lines.push("", "  No tasks completed.");
    lines.push("");
  }

  lines.push(`TASKS NOT COMPLETED (${b.outstanding.length})`);
  if (b.outstanding.length) for (const o of b.outstanding) lines.push(`  - ${o}`);
  else lines.push("  Every task was completed.");
  lines.push("");

  lines.push("HANDOVER LOG");
  if (b.handover.length) {
    for (const h of b.handover) lines.push(`  ${h.personName}, ${timeLabel(h.createdAt)}: ${h.body}`);
  } else {
    lines.push("  No handover notes this shift.");
  }

  return lines.join("\n");
}

function htmlBody(date: string, part: Part, b: Built, updateNote?: string): string {
  const day = parseYmd(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const h3 = (s: string) => `<h3 style="font-family:sans-serif;font-size:14px;color:#2C2C2A;margin:18px 0 8px;">${s}</h3>`;

  const health = b.health.length
    ? `<div style="border:1px solid #E2725B;background:#FCEDE8;border-radius:10px;padding:14px;margin-bottom:12px;">
        <p style="margin:0 0 6px;font-weight:800;color:#9A3A26;">Health concerns</p>
        ${b.health
          .map(
            (h) =>
              `<p style="margin:4px 0;font-size:14px;">${h.urgent ? "<b>URGENT</b> " : ""}${h.dogName ? `<b>${esc(h.dogName)}:</b> ` : ""}${esc(h.body)} <span style="color:#6B6B68;font-size:12px;">(${esc(h.personName)}, ${timeLabel(h.createdAt)})</span></p>`,
          )
          .join("")}
      </div>`
    : "";

  const taskList = (heading: string, items: string[]) =>
    items.length
      ? `<p style="margin:12px 0 4px;font-size:13px;font-weight:800;color:#2C2C2A;">${heading} (${items.length})</p>
         <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
      : "";

  const person = (p: PersonBlock) => `
    <div style="border:1px solid #E0DDD6;border-radius:10px;padding:14px;margin-bottom:12px;">
      <p style="margin:0 0 6px;font-weight:800;color:#2C2C2A;">
        ${esc(p.name)} <span style="font-weight:600;color:#6B6B68;font-size:13px;">
          ${p.startedAt ? `signed in ${timeLabel(p.startedAt)}${p.endedAt ? `, out ${timeLabel(p.endedAt)}` : ", still signed in"}` : "not signed in to this shift"}
        </span>
      </p>
      ${p.status.map((s) => `<p style="margin:4px 0;font-size:13px;color:#2C2C2A;">${esc(s)}</p>`).join("")}
      ${p.flags.map((f) => `<p style="margin:4px 0;color:#C1800F;font-size:13px;">${esc(f)}</p>`).join("")}
      ${taskList("Tasks completed", p.done)}
      ${taskList("Not needed", p.notNeeded)}
      ${taskList("Extra tasks, off the checklist", p.extraDone)}
      ${!p.done.length && !p.notNeeded.length && !p.extraDone.length ? `<p style="margin:10px 0 0;font-size:14px;color:#6B6B68;">No tasks completed.</p>` : ""}
    </div>`;

  const outstanding = b.outstanding.length
    ? `<div style="border:1px solid #F0D69A;background:#FEF3DC;border-radius:10px;padding:14px;">
        <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;">${b.outstanding.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      </div>`
    : `<p style="margin:0;font-size:14px;color:#6B6B68;">Every task was completed.</p>`;

  const handover = b.handover.length
    ? b.handover
        .map(
          (h) =>
            `<p style="margin:4px 0;font-size:14px;"><b>${esc(h.personName)}</b> <span style="color:#6B6B68;font-size:12px;">${timeLabel(h.createdAt)}</span><br>${esc(h.body)}</p>`,
        )
        .join("")
    : `<p style="margin:0;font-size:14px;color:#6B6B68;">No handover notes this shift.</p>`;

  return `
    <div style="font-family:sans-serif;max-width:520px;">
      ${updateNote ? `<p style="margin:0 0 12px;padding:10px 12px;background:#FEF3DC;border:1px solid #F0D69A;border-radius:8px;font-size:14px;">${esc(updateNote)}</p>` : ""}
      <h2 style="font-family:sans-serif;color:#0F5A8F;">${PART_LABEL[part]} shift, ${day}</h2>
      ${health}
      ${b.people.map(person).join("")}
      ${h3(`Tasks not completed (${b.outstanding.length})`)}
      ${outstanding}
      ${h3("Handover log")}
      ${handover}
    </div>`;
}

/** When the session is over: its rostered end, pushed back by the longest
 *  overtime anyone on it has logged. */
function sessionEndMs(date: string, sessionEnds: string, shifts: SessionShiftRow[]): number {
  const extra = Math.max(0, ...shifts.map((s) => s.extendedMinutes ?? 0));
  return sessionInstant(date, sessionEnds).getTime() + extra * 60000;
}

async function buildSession(date: string, part: Part): Promise<Built> {
  const [session, shifts, tasks, handover, health, { radiusM, lateAfterMinutes }] = await Promise.all([
    ensureRosterSession(date, part),
    getSessionShifts(date, part),
    getSessionTasks(date, part),
    getSessionHandover(date, part),
    getSessionHealthConcerns(date, part),
    getShiftSettings(),
  ]);
  const endsAtMs = sessionEndMs(date, session.ends, shifts);
  return buildBlocks(date, shifts, tasks, handover, health, radiusM, lateAfterMinutes, endsAtMs);
}

/** Sends the summary for (date, part) if, and only if, the session's
 *  finish time has passed, every shift against it is closed, at least one
 *  person signed in, there are recipients configured, and it hasn't
 *  already gone out. Safe to call speculatively (after every sign-out,
 *  every auto-close, and from the scheduled checks); a no-op otherwise.
 *
 *  Waiting for the finish time means someone who ends their shift a little
 *  early doesn't send an email that leaves out a colleague still to sign
 *  in. The scheduled checks then send it shortly after the finish time. */
export async function maybeSendShiftEmail(date: string, part: Part): Promise<void> {
  const session = await ensureRosterSession(date, part);
  const shifts = await getSessionShifts(date, part);
  if (shifts.length === 0) return;
  if (Date.now() < sessionEndMs(date, session.ends, shifts)) return;
  if (await hasOpenShiftsForSession(date, part)) return;

  // The first email for a session goes once. But if the picture changed
  // after it went (a shift closed automatically was then reopened, someone
  // signed in after it, or a forgotten shift was entered afterwards), send
  // one updated email that replaces it.
  const sentAt = session.emailSentAt ? new Date(session.emailSentAt).getTime() : null;
  const changedAfterSend =
    sentAt !== null &&
    shifts.some(
      (s) =>
        (s.reopenedAt && new Date(s.reopenedAt).getTime() > sentAt) || new Date(s.createdAt).getTime() > sentAt,
    );
  if (sentAt !== null && !changedAfterSend) return;

  const built = await buildSession(date, part);
  if (built.people.every((p) => !p.startedAt)) return;

  const recipients = await getShiftEmailRecipients();
  if (recipients.length === 0) return;

  // Claim the send first, so two checks running at the same moment (an End
  // shift and the scheduled check) can't both send it. Only the one whose
  // update matches the old value goes ahead.
  const supabase = await shiftDb();
  const claim = supabase.from("roster_session").update({ email_sent_at: new Date().toISOString() }).eq("id", session.id);
  const { data: claimed } = await (session.emailSentAt
    ? claim.eq("email_sent_at", session.emailSentAt)
    : claim.is("email_sent_at", null)
  ).select("id");
  if (!claimed || claimed.length === 0) return;

  const day = parseYmd(date).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const updateNote = changedAfterSend
    ? `UPDATED. This replaces the email sent at ${timeLabel(session.emailSentAt as string)}. Something changed after it went (a shift was reopened, someone signed in later, or a forgotten shift was entered afterwards), so this shows everything.`
    : undefined;
  const result = await sendEmail({
    to: recipients,
    subject: `${changedAfterSend ? "UPDATED: " : ""}CAPS ${PART_LABEL[part]} shift, ${day}`,
    text: textBody(date, part, built, updateNote),
    html: htmlBody(date, part, built, updateNote),
  });

  if (!result.ok) {
    console.error("maybeSendShiftEmail: send failed", result.error);
    // Give the claim back, so the next check tries again.
    await supabase.from("roster_session").update({ email_sent_at: session.emailSentAt }).eq("id", session.id);
  }
}

/** What the summary for (date, part) would say right now, built by the
 *  same code as the real email, so the on-screen preview can never drift
 *  from what actually gets sent. Sends nothing and changes nothing. */
export async function getShiftEmailPreview(date: string, part: Part): Promise<EmailPreview> {
  const [built, recipients] = await Promise.all([buildSession(date, part), getShiftEmailRecipients()]);
  return { date, part, ...built, hasRecipients: recipients.length > 0 };
}

/** The immediate email for one health concern. Returns whether it was
 *  actually sent: false when nobody is set up to receive it, or the send
 *  failed, so the screen can say so plainly instead of implying Shayna was
 *  told. */
export async function sendHealthConcernEmail(opts: {
  concernId: string;
  personName: string;
  part: Part;
  date: string;
  dogName: string | null;
  urgent: boolean;
  body: string;
}): Promise<boolean> {
  const recipients = await getHealthConcernRecipients();
  if (recipients.length === 0) return false;

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const day = parseYmd(opts.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const who = opts.dogName ? ` (${opts.dogName})` : "";
  const subject = `${opts.urgent ? "URGENT " : ""}CAPS health concern${who}`;
  const intro = `${opts.personName} raised a health concern on the ${PART_LABEL[opts.part].toLowerCase()} shift, ${day}.`;

  const result = await sendEmail({
    to: recipients,
    subject,
    text: `${intro}\n\n${opts.urgent ? "Marked urgent.\n" : ""}${opts.dogName ? `Dog: ${opts.dogName}\n` : ""}${opts.body}`,
    html: `<div style="font-family:sans-serif;max-width:520px;">
      <h2 style="color:#9A3A26;">${opts.urgent ? "URGENT: " : ""}Health concern${esc(who)}</h2>
      <p style="font-size:14px;">${esc(intro)}</p>
      <div style="border:1px solid #E2725B;background:#FCEDE8;border-radius:10px;padding:14px;font-size:14px;">${esc(opts.body)}</div>
    </div>`,
  });
  if (!result.ok) {
    console.error("sendHealthConcernEmail: send failed", result.error);
    return false;
  }
  const supabase = await shiftDb();
  await supabase.from("health_concern").update({ emailed_at: new Date().toISOString() }).eq("id", opts.concernId);
  return true;
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

/** How long after a rostered session starts, with nobody signed in at all,
 *  before Renee and Shayna are told. */
const NOBODY_SIGNED_IN_AFTER_MINUTES = 30;

/** Emails the shift recipients about any rostered session today that
 *  nobody has signed in to, 30 minutes after it started. Once per session.
 *  Someone may well be working and just not using the app (as happened with
 *  a stand-in who didn't know it), so the wording asks them to check rather
 *  than saying nobody turned up. */
export async function sendNobodySignedInAlerts(): Promise<void> {
  const recipients = await getShiftEmailRecipients();
  if (recipients.length === 0) return;
  const sessions = await getUnattendedSessions(NOBODY_SIGNED_IN_AFTER_MINUTES);
  if (sessions.length === 0) return;

  const supabase = await shiftDb();
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const s of sessions) {
    // Claim it first so two checks at once can't both send it.
    const { data: claimed } = await supabase
      .from("roster_session")
      .update({ no_show_alert_sent_at: new Date().toISOString() })
      .eq("id", s.sessionId)
      .is("no_show_alert_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const day = parseYmd(s.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    const who = s.rostered.join(" and ");
    const intro = `Nobody has signed in to the ${PART_LABEL[s.part].toLowerCase()} shift (${time12(s.starts)} to ${time12(s.ends)}), ${day}.`;
    const detail = `Rostered: ${who}. It is now ${NOBODY_SIGNED_IN_AFTER_MINUTES} minutes past the start. Someone may be working without using the app, so please check.`;
    const result = await sendEmail({
      to: recipients,
      subject: `CAPS: nobody signed in for the ${PART_LABEL[s.part].toLowerCase()} shift, ${parseYmd(s.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`,
      text: `${intro}\n\n${detail}`,
      html: `<div style="font-family:sans-serif;max-width:520px;">
        <h2 style="color:#8A5A00;">Nobody signed in</h2>
        <p style="font-size:14px;">${esc(intro)}</p>
        <p style="font-size:14px;">${esc(detail)}</p>
      </div>`,
    });
    if (!result.ok) {
      console.error("sendNobodySignedInAlerts: send failed", result.error);
      await supabase.from("roster_session").update({ no_show_alert_sent_at: null }).eq("id", s.sessionId);
    }
  }
}

/** Everything the scheduled checks do, every 15 minutes, whether or not
 *  anyone has the app open: close abandoned shifts, send any shift email
 *  that is now due (today's and yesterday's sessions), and warn about a
 *  rostered session nobody has signed in to. Must run inside runAsService
 *  (no one is logged in). Each step is best-effort so one failure never
 *  stops the others. */
export async function runScheduledShiftChecks(): Promise<void> {
  await checkAutoCloseAndSendEmails();
  const today = shelterToday();
  for (const date of [shiftDay(today, -1), today]) {
    for (const part of ["morning", "afternoon"] as Part[]) {
      await maybeSendShiftEmail(date, part).catch((e) => console.error("scheduled: shift email failed", date, part, e));
    }
  }
  await sendNobodySignedInAlerts().catch((e) => console.error("scheduled: nobody-signed-in alert failed", e));
}
