// Email copy for the homecare approval flow. Plain functions — no server
// imports. Each returns { subject, text, html }.

export const DEFAULT_ADMIN_EMAIL = "consult@capeanimalprotectionshelter.org.au";

const BRAND = "#1A7ABF";
const OK = "#3f9d6b";
const INK = "#2C2C2A";
const MUTED = "#6B6B68";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Wrap body HTML in a plain, mail-client-safe shell. */
function shell(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};font-size:15px;line-height:1.5;max-width:520px;margin:0 auto;padding:8px">
${bodyHtml}
<p style="color:${MUTED};font-size:12px;margin-top:28px">Cape Animal Protection Shelter</p>
</div>`;
}

function button(href: string, label: string, colour = OK): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:${colour};color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">${esc(label)}</a></p>`;
}

const SPAM_NOTE_TEXT =
  "If this landed in your spam or junk folder, please mark it \"not spam\" and add CAPS to your contacts so our future emails reach you.";
const SPAM_NOTE_HTML = `<p style="color:${MUTED};font-size:13px">If this landed in your spam or junk folder, please mark it &ldquo;not spam&rdquo; and add CAPS to your contacts so our future emails reach you.</p>`;

function programList(wantsFoster: boolean, wantsJailBreak: boolean): string {
  return [wantsFoster && "fostering", wantsJailBreak && "the jail break program"]
    .filter(Boolean)
    .join(" and ");
}

export function adminNotificationEmail(opts: {
  name: string;
  email: string;
  phone: string;
  address: string | null;
  experience: string | null;
  wantsFoster: boolean;
  wantsJailBreak: boolean;
  jailBreakApproveUrl: string | null;
  personUrl: string;
}): { subject: string; text: string; html: string } {
  const programs = programList(opts.wantsFoster, opts.wantsJailBreak);

  const textLines: string[] = [
    `${opts.name} has applied for homecare — ${programs}.`,
    "",
    `Email:   ${opts.email}`,
    `Phone:   ${opts.phone}`,
  ];
  if (opts.address) textLines.push(`Address: ${opts.address}`);
  if (opts.experience) textLines.push(`Experience: ${opts.experience}`);
  textLines.push("", `Their record: ${opts.personUrl}`);
  if (opts.wantsJailBreak && opts.jailBreakApproveUrl) {
    textLines.push("", "JAIL BREAK — approve (one click, no login needed):", opts.jailBreakApproveUrl);
  }
  if (opts.wantsFoster) {
    textLines.push(
      "",
      "FOSTER — arrange a home visit, record the home check on their record, then approve the foster role there.",
    );
  }

  const rows = [
    ["Email", opts.email],
    ["Phone", opts.phone],
    ...(opts.address ? [["Address", opts.address]] : []),
    ...(opts.experience ? [["Experience", opts.experience]] : []),
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="color:${MUTED};padding:2px 12px 2px 0">${esc(k)}</td><td>${esc(v)}</td></tr>`,
    )
    .join("");

  const html = shell(
    `<p><strong>${esc(opts.name)}</strong> has applied for homecare &mdash; ${esc(programs)}.</p>
<table style="border-collapse:collapse;font-size:14px;margin:12px 0">${rows}</table>
<p><a href="${esc(opts.personUrl)}" style="color:${BRAND}">Open their record &rarr;</a></p>
${
  opts.wantsJailBreak && opts.jailBreakApproveUrl
    ? `<p style="margin-top:20px"><strong>Jail break</strong> &mdash; approve here (one click, no login):</p>${button(opts.jailBreakApproveUrl, "Approve for jail break")}`
    : ""
}
${
  opts.wantsFoster
    ? `<p style="margin-top:16px"><strong>Foster</strong> &mdash; arrange a home visit, record the home check on their record, then approve the foster role there.</p>`
    : ""
}`,
  );

  return { subject: `New homecare application: ${opts.name}`, text: textLines.join("\n"), html };
}

export function applicantAckEmail(opts: {
  firstName: string;
  wantsFoster: boolean;
  wantsJailBreak: boolean;
}): { subject: string; text: string; html: string } {
  const textLines = [`Hi ${opts.firstName},`, "", "Thanks for your interest in homecare with CAPS."];
  if (opts.wantsJailBreak)
    textLines.push(
      "",
      "Jail break: we'll review your application and be in touch. You'll get an email once you're approved.",
    );
  if (opts.wantsFoster)
    textLines.push(
      "",
      "Fostering: someone from CAPS will contact you to arrange a home visit and talk through your home. This can take a little while — thanks for your patience.",
    );
  textLines.push("", SPAM_NOTE_TEXT, "", "— CAPS");

  const html = shell(
    `<p>Hi ${esc(opts.firstName)},</p>
<p>Thanks for your interest in homecare with CAPS.</p>
${opts.wantsJailBreak ? `<p><strong>Jail break:</strong> we'll review your application and be in touch. You'll get an email once you're approved.</p>` : ""}
${opts.wantsFoster ? `<p><strong>Fostering:</strong> someone from CAPS will contact you to arrange a home visit and talk through your home. This can take a little while &mdash; thanks for your patience.</p>` : ""}
${SPAM_NOTE_HTML}`,
  );

  return { subject: "We've received your homecare application", text: textLines.join("\n"), html };
}

export function approvedEmail(opts: {
  firstName: string;
  kind: "foster" | "jail break";
}): { subject: string; text: string; html: string } {
  const text = [
    `Hi ${opts.firstName},`,
    "",
    `Good news — you've been approved as a ${opts.kind} carer.`,
    "",
    "Next time you're at the shelter you can take a dog out — just check in with a caretaker and they'll set it up.",
    "",
    SPAM_NOTE_TEXT,
    "",
    "— CAPS",
  ].join("\n");

  const html = shell(
    `<p>Hi ${esc(opts.firstName)},</p>
<p>Good news &mdash; you've been approved as a <strong>${esc(opts.kind)} carer</strong>.</p>
<p>Next time you're at the shelter you can take a dog out &mdash; just check in with a caretaker and they'll set it up.</p>
${SPAM_NOTE_HTML}`,
  );

  return { subject: `You're approved as a ${opts.kind} carer with CAPS`, text, html };
}

/** The starting draft for the "improvements needed after a home check"
 *  email. Staff edit this before it sends. */
export function improvementsDraft(opts: { firstName: string; items: string }): string {
  return [
    `Hi ${opts.firstName},`,
    "",
    "Thanks for offering to foster a dog, and for having us visit.",
    "",
    "Before we can approve your home for fostering, we'd need the following sorted:",
    "",
    opts.items.trim() || "- ",
    "",
    "Once that's done, let us know and we'll arrange another quick visit.",
    "",
    "— CAPS",
  ].join("\n");
}

export function improvementsEmail(body: string): {
  subject: string;
  text: string;
  html: string;
} {
  const text = `${body}\n\n${SPAM_NOTE_TEXT}`;
  const html = shell(
    `${body
      .split("\n")
      .map((line) => (line.trim() ? `<p>${esc(line)}</p>` : ""))
      .join("")}${SPAM_NOTE_HTML}`,
  );
  return { subject: "Your CAPS home check — a few things to sort first", text, html };
}
