import Link from "next/link";
import type { PersonDetail } from "@/lib/person-detail";
import { VOLUNTEER_INTERESTS } from "@/lib/registration";
import { ROLE_LABEL, STATUS_LABEL, STATUS_TEXT_CLASS } from "@/lib/people";
import { formatDate } from "@/lib/format";
import { PersonRoleActions } from "@/components/people/person-role-actions";
import { PersonArchiveButton } from "@/components/people/person-archive-button";

const INTEREST_LABEL = new Map(VOLUNTEER_INTERESTS.map((i) => [i.code, i.label]));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-[var(--radius)] p-4 flex flex-col gap-2">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function numOrNull(n: number | null): string | null {
  return n === null || n === undefined ? null : String(n);
}

function fenceText(hp: NonNullable<PersonDetail["homecareProfile"]>): string | null {
  const parts = [hp.fenceType, hp.fenceHeight].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function PersonDetailView({ person }: { person: PersonDetail }) {
  const archived =
    person.roles.length > 0 &&
    !person.roles.some((r) => r.status === "active" || r.status === "pending");
  const ecMissing = !person.ec.name || !person.ec.phone;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              {person.firstName} {person.surname}
            </h1>
            {person.nickname && <span className="text-sm text-ink-muted">&ldquo;{person.nickname}&rdquo;</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            {person.isMinor && <span className="font-bold text-warm-ink">Under 18</span>}
            <span className="text-ink-muted">
              {person.hasAccount ? "Has an app account" : "No app account"}
            </span>
            {archived && <span className="text-ink-muted">· archived</span>}
          </div>
        </div>
        <PersonArchiveButton personId={person.id} archived={archived} />
      </div>

      <Section title="Roles">
        {person.roles.length === 0 && <p className="text-sm text-ink-muted">No roles.</p>}
        {person.roles.map((r) => (
          <div key={r.id} className="text-sm border-b border-line last:border-0 pb-2 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{ROLE_LABEL[r.role]}</span>
              <span className={`text-xs font-bold ${STATUS_TEXT_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            {(r.grantedOn || r.approverName) && (
              <p className="text-xs text-ink-muted">
                {r.grantedOn ? `Active from ${formatDate(r.grantedOn)}` : ""}
                {r.approverName ? ` · by ${r.approverName}` : ""}
              </p>
            )}
            {r.endedOn && <p className="text-xs text-ink-muted">Ended {formatDate(r.endedOn)}</p>}
            {r.note && <p className="text-xs text-ink-muted">{r.note}</p>}
            {r.status === "pending" && (
              <PersonRoleActions
                roleId={r.id}
                personId={person.id}
                approveBlockedReason={
                  r.role === "foster_carer" && !person.homecareProfile?.yardCheckDone
                    ? "Foster needs a home visit first."
                    : undefined
                }
                approveBlockedHref={
                  r.role === "foster_carer" && !person.homecareProfile?.yardCheckDone
                    ? `/people/${person.id}/yard-check`
                    : undefined
                }
              />
            )}
          </div>
        ))}
      </Section>

      <Section title="Contact">
        <Field label="Email" value={person.email} />
        <Field label="Phone" value={person.phone} />
        <Field label="Address" value={person.address} />
        <Field
          label="Date of birth"
          value={
            person.dateOfBirth
              ? `${formatDate(person.dateOfBirth)}${person.age !== null ? ` (${person.age})` : ""}`
              : null
          }
        />
        <Field
          label="Promo image consent"
          value={
            person.imageConsent === null ? "Not asked" : person.imageConsent ? "Yes" : "No"
          }
        />
      </Section>

      <Section title="Emergency contact">
        {ecMissing && (
          <p className="text-sm text-danger font-semibold">No emergency contact on file.</p>
        )}
        <Field label="Name" value={person.ec.name} />
        <Field label="Phone" value={person.ec.phone} />
        <Field label="Relationship" value={person.ec.relationship} />
        <Field label="Email" value={person.ec.email} />
      </Section>

      {person.isMinor && (
        <Section title="Parent / guardian">
          <Field label="Name" value={person.parent.name} />
          <Field label="Phone" value={person.parent.phone} />
          <Field label="Email" value={person.parent.email} />
          <Field
            label="Consent"
            value={
              person.parent.consent
                ? `Given${person.parent.consentDate ? ` ${formatDate(person.parent.consentDate)}` : ""}`
                : "Not given"
            }
          />
        </Section>
      )}

      {person.volunteerProfile && (
        <Section title="Volunteer details">
          <Field
            label="Interests"
            value={
              person.volunteerProfile.interests.length
                ? person.volunteerProfile.interests.map((c) => INTEREST_LABEL.get(c) ?? c).join(", ")
                : null
            }
          />
          <Field label="Experience" value={person.volunteerProfile.experience} />
          <Field label="Medical issues" value={person.volunteerProfile.medicalIssues} />
          <Field label="How they heard" value={person.volunteerProfile.howHeard} />
          <Field
            label="Signed"
            value={
              person.volunteerProfile.signatureName
                ? `${person.volunteerProfile.signatureName}${
                    person.volunteerProfile.signatureDate
                      ? ` · ${formatDate(person.volunteerProfile.signatureDate)}`
                      : ""
                  }`
                : null
            }
          />
        </Section>
      )}

      {person.homecareProfile && (
        <HomecareSection personId={person.id} hp={person.homecareProfile} />
      )}

      {person.notesInternal && (
        <Section title="Staff notes">
          <p className="text-sm whitespace-pre-wrap">{person.notesInternal}</p>
        </Section>
      )}
    </div>
  );
}

function HomecareSection({
  personId,
  hp,
}: {
  personId: string;
  hp: NonNullable<PersonDetail["homecareProfile"]>;
}) {
  const yardCheckHref = `/people/${personId}/yard-check`;
  return (
    <Section title="Homecare">
      <Field label="Applied" value={hp.appliedOn ? formatDate(hp.appliedOn) : null} />
      {hp.yardCheckDone ? (
        <>
          <div className="flex justify-between gap-4 text-sm py-0.5">
            <span className="text-ink-muted">Yard check</span>
            <span className="text-right text-ok font-semibold">
              Done{hp.yardCheckOn ? ` ${formatDate(hp.yardCheckOn)}` : ""}
              {hp.yardCheckByName ? ` · ${hp.yardCheckByName}` : ""}
            </span>
          </div>
          <Field label="Property" value={hp.propertyOwnership} />
          <Field label="Fence" value={fenceText(hp)} />
          <Field label="People at home" value={numOrNull(hp.peopleAtHome)} />
          <Field label="Children under 16" value={numOrNull(hp.childrenU16)} />
          <Field label="Other animals" value={hp.otherAnimals} />
          <Field label="Animal notes" value={hp.animalDetails} />
          <Field
            label="Pets vaccinated"
            value={hp.vaccinesCurrent === null ? null : hp.vaccinesCurrent ? "Yes" : "No"}
          />
          {hp.yardCheckNotes && (
            <p className="text-sm whitespace-pre-wrap pt-1">{hp.yardCheckNotes}</p>
          )}
          <Link href={yardCheckHref} className="text-xs text-brand-ink underline font-semibold pt-1">
            Update yard check
          </Link>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-muted">Yard check not done</span>
          <Link href={yardCheckHref} className="text-brand-ink underline font-semibold">
            Record yard check
          </Link>
        </div>
      )}
    </Section>
  );
}
