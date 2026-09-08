import type { DogConfidential, DogDetail, MedicalEvent, ActivityEntry, NoteEntry } from "@/lib/dog-detail";
import { STATUS_COLOR_VAR, endActionLabel } from "@/lib/dogs";
import {
  formatDate,
  formatDaysHoursOut,
  formatMinutesOut,
  formatStartedLine,
  formatYearsMonths,
} from "@/lib/format";
import { DogActionButton } from "@/components/dogs/dog-action-button";
import { ActionMenu } from "@/components/dogs/action-menu";
import { ActivitySection } from "@/components/dogs/activity-section";

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
  medicalEvents,
  activityLog,
  currentActivity,
  latestOfEachType,
  notes,
  isStaff,
  currentPersonId,
  currentPersonName,
}: {
  dog: DogDetail;
  confidential: DogConfidential | null;
  medicalEvents: MedicalEvent[];
  activityLog: ActivityEntry[];
  currentActivity: ActivityEntry | null;
  latestOfEachType: { type: string; entry: ActivityEntry | null }[];
  notes: NoteEntry[];
  isStaff: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const primaryPhoto = dog.photos.find((p) => p.isPrimary) ?? dog.photos[0];
  const age = dog.dateOfBirth ? formatYearsMonths(dog.dateOfBirth) : dog.ageOverride;
  const timeWithCaps = dog.arrivalDate ? formatYearsMonths(dog.arrivalDate) : "Time unknown";
  const canBringIn = isStaff || currentActivity?.personId === currentPersonId;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
          <img src={primaryPhoto.url} alt={dog.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-tint flex items-center justify-center text-2xl font-bold text-ink-muted shrink-0">
            {dog.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              {dog.name}
            </h1>
            <span className="text-sm text-ink-muted">{dog.ref}</span>
          </div>
          <span
            className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: `var(${STATUS_COLOR_VAR[dog.status]})` }}
          >
            {dog.status.replace("_", " ")}
          </span>
          {dog.experiencedHandlerOnly && (
            <span className="ml-2 text-xs font-semibold text-warm-ink">⚠️ Experienced handlers only</span>
          )}
          {currentActivity && <CurrentStatusLine status={dog.status} current={currentActivity} />}
        </div>

        <div className="flex items-center gap-1.5">
          {dog.status === "available" && (
            <DogActionButton
              dogId={dog.id}
              mode="walk"
              label="Start Walk"
              isStaff={isStaff}
              currentPersonId={currentPersonId}
              currentPersonName={currentPersonName}
            />
          )}
          {dog.status === "available" && (
            <ActionMenu
              dogId={dog.id}
              isStaff={isStaff}
              currentPersonId={currentPersonId}
              currentPersonName={currentPersonName}
            />
          )}
          {currentActivity && canBringIn && (
            <DogActionButton
              dogId={dog.id}
              mode="bring_in"
              label={endActionLabel(dog.status)}
              isStaff={isStaff}
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
        <Field label="Handling notes" value={dog.handlingNotes} />
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
          <Field label="Listed on SavourLife" value={yesNo(dog.listedOnSavourlife)} />
        </Section>
      )}

      {isStaff && (confidential || medicalEvents.length > 0) && (
        <Section title="Staff only">
          {confidential && (
            <>
              <Field label="Behaviour notes" value={confidential.behaviourNotes} />
              <Field label="Adoption history" value={confidential.adoptionHistory} />
              <Field label="Internal medical summary" value={confidential.medicalSummaryInternal} />
              <Field label="Restrictions" value={confidential.restrictions} />
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
          isStaff={isStaff}
          currentPersonId={currentPersonId}
        />
      </Section>

      <Section title="Notes">
        {notes.length === 0 && <p className="text-sm text-ink-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="text-sm border-b border-line last:border-0 pb-2 last:pb-0">
            <p>{n.body}</p>
            <p className="text-xs text-ink-muted">
              {n.authorName ?? "Unknown"} · {formatDate(n.createdAt)}
            </p>
          </div>
        ))}
      </Section>

      <Section title="Time with CAPS">
        <p className="text-sm">{timeWithCaps}</p>
      </Section>
    </div>
  );
}

function CurrentStatusLine({ status, current }: { status: DogDetail["status"]; current: ActivityEntry }) {
  const overdue = current.dueBack ? new Date(current.dueBack) < new Date() : false;
  const who = current.personName ? `With: ${current.personName} · ` : status === "yard" ? `${current.reason ?? "Yard"} · ` : "";
  const startLabel = status === "walking" || status === "yard" ? "Started" : "Start";
  const timeOut =
    status === "walking"
      ? ` · Time Out ${formatMinutesOut(current.startedAt)}`
      : status === "yard"
        ? ` · Time in Yard ${formatMinutesOut(current.startedAt)}`
        : status === "bed_rest" || status === "jail_break" || status === "fostered"
          ? ` · Time out: ${formatDaysHoursOut(current.startedAt)}`
          : "";
  return (
    <p className="text-sm text-ink-muted mt-1">
      {who}
      {formatStartedLine(startLabel, current.startedAt)}
      {current.dueBack && <> · {formatStartedLine("Due End", current.dueBack)}</>}
      {status === "bed_rest" && current.reason ? ` · ${current.reason}` : ""}
      {overdue && (
        <span className="text-danger font-semibold" title="Overdue">
          {" "}
          ⏰ Overdue
        </span>
      )}
      {timeOut}
    </p>
  );
}
