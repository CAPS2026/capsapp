import Link from "next/link";
import type { DogConfidential, DogDetail, DogIntake, MedicalEvent, ActivityEntry, NoteEntry } from "@/lib/dog-detail";
import { STATUS_COLOR_VAR, endActionLabel } from "@/lib/dogs";
import {
  formatDate,
  formatDaysHoursOut,
  formatMinutesOut,
  formatStartedLine,
  formatYearsMonths,
} from "@/lib/format";
import { deleteDog } from "@/lib/actions/dogs";
import { DogActionButton } from "@/components/dogs/dog-action-button";
import { ActionMenu } from "@/components/dogs/action-menu";
import { ActivitySection } from "@/components/dogs/activity-section";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Field } from "@/components/detail-field";
import { slStatusLabel } from "@/lib/savourlife-status";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-[var(--radius)] p-4 flex flex-col gap-2">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function yesNo(v: boolean | null): string | null {
  if (v === null) return null;
  return v ? "Yes" : "No";
}

function goodWithLabel(v: "yes" | "no" | "untested" | null): string | null {
  if (!v) return null;
  return v === "yes" ? "Yes" : v === "no" ? "No" : "Untested";
}

export function DogDetailView({
  dog,
  confidential,
  intake,
  medicalEvents,
  activityLog,
  currentActivity,
  latestOfEachType,
  notes,
  isStaff,
  isAdmin,
  canKiosk,
  currentPersonId,
  currentPersonName,
}: {
  dog: DogDetail;
  confidential: DogConfidential | null;
  intake: DogIntake | null;
  medicalEvents: MedicalEvent[];
  activityLog: ActivityEntry[];
  currentActivity: ActivityEntry | null;
  latestOfEachType: { type: string; entry: ActivityEntry | null }[];
  notes: NoteEntry[];
  isStaff: boolean;
  isAdmin: boolean;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const primaryPhoto = dog.photos.find((p) => p.isPrimary) ?? dog.photos[0];
  const age = dog.dateOfBirth ? formatYearsMonths(dog.dateOfBirth) : dog.ageOverride;
  const timeWithCaps = dog.arrivalDate ? formatYearsMonths(dog.arrivalDate) : "Time unknown";
  const canBringIn = canKiosk || currentActivity?.personId === currentPersonId;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
            <img
              src={primaryPhoto.url}
              alt={dog.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-tint flex items-center justify-center text-2xl font-bold text-ink-muted shrink-0">
              {dog.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {dog.name}
              </h1>
              <span className="text-sm text-ink-muted">{dog.ref}</span>
              {isStaff && (
                <>
                  <Link href={`/dogs/${dog.id}/edit`} className="text-sm font-bold text-brand-ink underline ml-1">
                    Edit dog
                  </Link>
                  <Link
                    href={`/dogs/${dog.id}/savourlife`}
                    className="text-sm font-bold px-3 py-1 rounded-[var(--radius)] bg-warm text-ink ml-1"
                  >
                    Generate SavourLife details
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span
                className="inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: `var(${STATUS_COLOR_VAR[dog.status]})` }}
              >
                {dog.status.replace("_", " ")}
              </span>
              {dog.experiencedHandlerOnly && (
                <span className="text-xs font-semibold text-warm-ink">⚠️ Experienced handlers only</span>
              )}
            </div>
            {currentActivity && <CurrentStatusLine status={dog.status} current={currentActivity} />}
          </div>
        </div>

        {/* Actions on their own full-width row — on a phone they were being
            crushed into a sliver beside the photo and the status line. */}
        <div className="flex items-center gap-2">
          {dog.status === "available" && (
            <DogActionButton
              dogId={dog.id}
              mode="walk"
              label="Start Walk"
              canKiosk={canKiosk}
              currentPersonId={currentPersonId}
              currentPersonName={currentPersonName}
            />
          )}
          {dog.status === "available" && (
            <ActionMenu
              dogId={dog.id}
              isStaff={isStaff}
              canKiosk={canKiosk}
              currentPersonId={currentPersonId}
              currentPersonName={currentPersonName}
            />
          )}
          {currentActivity && canBringIn && (
            <DogActionButton
              dogId={dog.id}
              mode="bring_in"
              label={endActionLabel(dog.status)}
              overdue={!!currentActivity.dueBack && new Date(currentActivity.dueBack) < new Date()}
              canKiosk={canKiosk}
              currentPersonId={currentPersonId}
              currentPersonName={currentPersonName}
            />
          )}
        </div>
      </div>

      <Section title="About">
        <Field label="Breed" value={dog.breed} />
        <Field label="Age" value={age} />
        <Field label="Sex" value={dog.sex === "M" ? "Male" : dog.sex === "F" ? "Female" : null} />
        <Field label="Size (adult)" value={dog.sizeWhenAdult} />
        <Field label="Colour" value={dog.colour} />
        <Field label="Weight" value={dog.weightKg ? `${dog.weightKg} kg` : null} />
        <Field label="Desexed" value={yesNo(dog.desexed)} />
        <Field label="Vaccinated" value={yesNo(dog.vaccinated)} />
        <Field label="Wormed" value={yesNo(dog.wormed)} />
        <Field label="Heartworm treated" value={yesNo(dog.heartwormTreated)} />
        <Field label="Good with kids (u5)" value={goodWithLabel(dog.goodWithKidsU5)} />
        <Field label="Good with kids (5-12)" value={goodWithLabel(dog.goodWithKids5to12)} />
        <Field label="Good with cats" value={goodWithLabel(dog.goodWithCats)} />
        <Field label="Good with dogs" value={goodWithLabel(dog.goodWithDogs)} />
        <Field label="Good with other animals" value={goodWithLabel(dog.goodWithOther)} />
        <Field label="Energy level" value={dog.energyLevel} />
        <Field label="House trained" value={dog.houseTrained} />
        <Field label="Handling notes" value={dog.handlingNotes} block />
        {dog.publicDescription && <p className="text-sm pt-1">{dog.publicDescription}</p>}
        {dog.publicMedicalSummary && (
          <p className="text-sm text-ink-muted pt-1">Medical summary: {dog.publicMedicalSummary}</p>
        )}
      </Section>

      {isStaff && (
        <Section title="Listing">
          <Field label="Adoption fee" value={dog.adoptionFee ? `$${dog.adoptionFee}` : null} />
          <Field label="Interstate adoption" value={yesNo(dog.interstateAdoption)} />
          <Field label="Available within" value={dog.adoptionAvailableWithin} />
          <Field label="Adoption policy" value={dog.adoptionPolicy} />
          <Field label="BIN / source no." value={dog.binSourceNumber} />
          <Field label="SavourLife ID" value={dog.savourlifeId} />
          <Field
            label="SavourLife status"
            value={[
              slStatusLabel(dog.slStatus),
              dog.slStatus === "on_hold" && dog.slHoldReason ? `(${dog.slHoldReason})` : "",
              dog.slStatus === "adopted" && dog.slEnquiryNumber ? `(enquiry ${dog.slEnquiryNumber})` : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <Field label="Coat length" value={dog.coatLength} />
          <Field label="Indoor only" value={yesNo(dog.indoorOnly)} />
          <Field label="Foster carer required" value={yesNo(dog.fosterCareRequired)} />
          <Field label="Special needs" value={dog.specialNeeds} block />
          <Field
            label="Bonded pair"
            value={dog.bondedPair ? `Yes${dog.bondedPairName ? ` - with ${dog.bondedPairName}` : ""}` : yesNo(dog.bondedPair)}
          />
          <Field
            label="Listing location"
            value={[dog.slSuburb, dog.slState, dog.slPostcode].filter(Boolean).join(" ") || null}
          />
          <Field label="Foster / case manager email" value={confidential?.slContactEmail ?? null} />
        </Section>
      )}

      {isStaff && intake && (
        <Section title="Intake record">
          <Field label="Date of intake" value={formatDate(intake.intakeDate)} />
          <Field label="Colour / markings" value={[dog.colour, dog.markings].filter(Boolean).join(" - ") || null} />
          <Field label="Surrendered by" value={intake.surrenderedBy} />
          <Field label="Reason for intake" value={intake.reason} block />
          <Field label="Condition" value={intake.condition ? intake.condition[0].toUpperCase() + intake.condition.slice(1) : null} />
          <Field label="Visible injuries / illness" value={intake.visibleInjuries} block />
          <Field label="Parasites observed" value={yesNo(intake.parasitesObserved)} />
          <Field
            label="Vaccination given"
            value={intake.vaccinationGiven ? `Yes${intake.vaccinationType ? ` (${intake.vaccinationType})` : ""}` : yesNo(intake.vaccinationGiven)}
          />
          <Field label="Flea / tick / worm treatment" value={yesNo(intake.fleaTickWormGiven)} />
          <Field
            label="Behaviour assessment"
            value={
              intake.behaviourAssessment
                .map((b) => (b === "other" ? (intake.behaviourOther ?? "Other") : b[0].toUpperCase() + b.slice(1)))
                .join(", ") || null
            }
          />
          <Field label="Notes" value={intake.notes} block />
          <Field label="Intake officer" value={intake.officerName} />
          <Field label="Signed" value={intake.signedName} />
        </Section>
      )}

      {isStaff && (confidential || medicalEvents.length > 0) && (
        <Section title="Staff only">
          {confidential && (
            <>
              <Field label="Behaviour notes" value={confidential.behaviourNotes} block />
              <Field label="Adoption history" value={confidential.adoptionHistory} block />
              <Field label="Internal medical summary" value={confidential.medicalSummaryInternal} block />
              <Field label="Restrictions" value={confidential.restrictions} block />
            </>
          )}
          {medicalEvents.length > 0 && (
            <div className="pt-2 flex flex-col gap-1">
              <h3 className="text-sm font-bold text-ink-muted">Medical events</h3>
              {medicalEvents.map((e) => (
                <p key={e.id} className="text-sm">
                  {formatDate(e.eventDate)} — {e.type}: {e.detail}
                  {e.vet ? ` (${e.vet})` : ""}
                </p>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Activity">
        <ActivitySection
          dogId={dog.id}
          latest={latestOfEachType}
          recent={activityLog}
          canKiosk={canKiosk}
          currentPersonId={currentPersonId}
        />
      </Section>

      <Section title="Notes">
        {notes.length === 0 && <p className="text-sm text-ink">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="text-sm border-b border-line last:border-0 pb-2 last:pb-0">
            <p>{n.body}</p>
            <p className="text-xs text-ink">
              {n.authorName ?? "Unknown"} · {formatDate(n.createdAt)}
            </p>
          </div>
        ))}
      </Section>

      <Section title="Time with CAPS">
        <p className="text-sm">{timeWithCaps}</p>
      </Section>

      {isAdmin && (
        <div className="flex justify-end pt-2">
          <ConfirmDeleteButton
            triggerLabel="Delete this dog"
            heading={`Delete ${dog.name}?`}
            body="This permanently removes the dog and all their activity, notes, medical events and photos. It can't be undone — for a dog that has left, set their status to Exited instead."
            confirmLabel="Delete"
            action={deleteDog.bind(null, dog.id)}
            redirectTo="/dogs"
          />
        </div>
      )}
    </div>
  );
}

function CurrentStatusLine({ status, current }: { status: DogDetail["status"]; current: ActivityEntry }) {
  const overdue = current.dueBack ? new Date(current.dueBack) < new Date() : false;
  const startLabel = status === "walking" || status === "yard" ? "Started" : "Start";
  const overdueFlag = overdue && (
    <span className="text-danger font-semibold" title="Overdue">
      {" "}
      ⏰ Overdue
    </span>
  );

  // Jail Break / Foster: who + time out on one line, start + due end below
  // (Paul, 2026-10-04) — same layout as the Dogs list card.
  if (status === "jail_break" || status === "fostered") {
    return (
      <div className="text-sm text-ink mt-1">
        <p>
          With: {current.personName ?? "someone"} · Time out: {formatDaysHoursOut(current.startedAt)}
        </p>
        <p>
          {formatStartedLine(startLabel, current.startedAt)}
          {current.dueBack && <> · {formatStartedLine("Due End", current.dueBack)}</>}
          {overdueFlag}
        </p>
      </div>
    );
  }

  const who = current.personName ? `With: ${current.personName} · ` : status === "yard" ? `${current.reason ?? "Yard"} · ` : "";
  const timeOut =
    status === "walking"
      ? ` · Time Out ${formatMinutesOut(current.startedAt)}`
      : status === "yard"
        ? ` · Time in Yard ${formatMinutesOut(current.startedAt)}`
        : status === "bed_rest"
          ? ` · Time out: ${formatDaysHoursOut(current.startedAt)}`
          : "";
  return (
    <p className="text-sm text-ink mt-1">
      {who}
      {formatStartedLine(startLabel, current.startedAt)}
      {current.dueBack && <> · {formatStartedLine("Due End", current.dueBack)}</>}
      {status === "bed_rest" && current.reason ? ` · ${current.reason}` : ""}
      {overdueFlag}
      {timeOut}
    </p>
  );
}
