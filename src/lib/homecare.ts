// Email copy for the homecare approval flow. Plain functions — no server
// imports — so they can be unit-checked and imported anywhere.

export const DEFAULT_ADMIN_EMAIL = "consult@capeanimalprotectionshelter.org.au";

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
}): { subject: string; text: string } {
  const programs = programList(opts.wantsFoster, opts.wantsJailBreak);
  const lines: string[] = [
    `${opts.name} has applied for homecare — ${programs}.`,
    "",
    `Email:   ${opts.email}`,
    `Phone:   ${opts.phone}`,
  ];
  if (opts.address) lines.push(`Address: ${opts.address}`);
  if (opts.experience) lines.push(`Experience: ${opts.experience}`);
  lines.push("", `Their record: ${opts.personUrl}`);

  if (opts.wantsJailBreak && opts.jailBreakApproveUrl) {
    lines.push(
      "",
      "JAIL BREAK — approve here (one click, no login needed):",
      opts.jailBreakApproveUrl,
    );
  }
  if (opts.wantsFoster) {
    lines.push(
      "",
      "FOSTER — arrange a home visit, record the yard check on their record above,",
      "then approve the foster role there.",
    );
  }

  return {
    subject: `New homecare application: ${opts.name}`,
    text: lines.join("\n"),
  };
}

export function applicantAckEmail(opts: {
  firstName: string;
  wantsFoster: boolean;
  wantsJailBreak: boolean;
}): { subject: string; text: string } {
  const lines = [`Hi ${opts.firstName},`, "", "Thanks for your interest in homecare with CAPS."];
  if (opts.wantsJailBreak) {
    lines.push(
      "",
      "Jail break: we'll review your application and be in touch. You'll get an email once you're approved.",
    );
  }
  if (opts.wantsFoster) {
    lines.push(
      "",
      "Fostering: someone from CAPS will contact you to arrange a visit and talk through your home. This can take a little while — thanks for your patience.",
    );
  }
  lines.push("", "— CAPS");
  return { subject: "We've received your homecare application", text: lines.join("\n") };
}

export function approvedEmail(opts: {
  firstName: string;
  kind: "foster" | "jail break";
}): { subject: string; text: string } {
  return {
    subject: `You're approved as a ${opts.kind} carer with CAPS`,
    text: [
      `Hi ${opts.firstName},`,
      "",
      `Good news — you've been approved as a ${opts.kind} carer.`,
      "",
      "Next time you're at the shelter you can take a dog out — just check in with a caretaker and they'll set it up.",
      "",
      "— CAPS",
    ].join("\n"),
  };
}
