import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getShiftChecklist, getShiftSettings, getTodayShifts } from "@/lib/shift-data";
import { PART_LABEL, PARTS, clock12, parseYmd, partForTime, shelterToday, type Part } from "@/lib/shift";
import { ShiftChecklist } from "@/components/shift/shift-checklist";

/** "View as admin": today's live checklist and who is on shift, without
 *  starting a shift, for Julie, Shayna and Renee (admins only). View only:
 *  nothing here can tick, claim, note or change anything, because there is
 *  only one live checklist and the caretakers are using it. */
export default async function AdminViewPage({ searchParams }: { searchParams: Promise<{ part?: string }> }) {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift");

  const sp = await searchParams;
  const part: Part = sp.part === "morning" || sp.part === "afternoon" ? sp.part : partForTime();
  const [checklist, shifts, settings] = await Promise.all([getShiftChecklist(part), getTodayShifts(), getShiftSettings()]);

  const all = [...Object.values(checklist.byCategory).flat(), ...checklist.extras];
  const done = all.filter((t) => t.status !== "open").length;
  const carriedOpen = checklist.carriedOver.filter((t) => t.status === "open").length;
  const day = parseYmd(shelterToday()).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-brand bg-brand-tint px-4 py-3">
        <div>
          <p className="m-0 text-base font-extrabold text-brand-ink" style={{ fontFamily: "var(--font-display)" }}>
            Viewing as admin: {day}
          </p>
          <p className="m-0 text-xs font-semibold text-ink-muted">View only. Nothing here changes the checklist.</p>
        </div>
        <Link href="/shift" className="text-sm font-bold text-brand-ink">
          Back to sign-in
        </Link>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Shifts today
        </h2>
        {shifts.length === 0 ? (
          <p className="m-0 text-sm text-ink-muted">Nobody has signed in yet today.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {shifts.map((s, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-[var(--radius)] border border-line bg-card px-3 py-2 text-sm">
                <span className="font-extrabold">
                  {s.personName}{" "}
                  <span className="font-semibold text-ink-muted">({PART_LABEL[s.part].toLowerCase()})</span>
                </span>
                <span className="text-xs font-semibold">
                  {s.endedAt ? (
                    <>
                      {clock12(s.startedAt)} to {clock12(s.endedAt)}
                      {s.autoClosed ? ", closed automatically" : ""}
                      {s.enteredAfterwards ? ", entered afterwards" : ""}
                    </>
                  ) : (
                    <span className="text-ok">On shift since {clock12(s.startedAt)}</span>
                  )}
                  {(s.lateMinutes ?? 0) > settings.lateAfterMinutes ? (
                    <span className="text-warm-ink">
                      {" "}
                      · {s.lateMinutes} min late{s.lateReason ? `: ${s.lateReason}` : ""}
                    </span>
                  ) : null}
                  {s.distanceM != null && s.distanceM > settings.radiusM ? (
                    <span className="text-warm-ink"> · signed in {(s.distanceM / 1000).toFixed(1)}km away</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            {PART_LABEL[part]} checklist{" "}
            <span className="text-sm font-semibold text-ink-muted">
              {done} of {all.length} done{carriedOpen ? `, ${carriedOpen} carried over still open` : ""}
            </span>
          </h2>
          <div className="flex gap-2">
            {PARTS.map((p) => (
              <Link
                key={p}
                href={`/shift/admin?part=${p}`}
                className={`inline-flex h-9 items-center rounded-[var(--radius)] border px-3 text-sm font-bold ${
                  p === part ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-card text-foreground"
                }`}
              >
                {PART_LABEL[p]}
              </Link>
            ))}
          </div>
        </div>
        <ShiftChecklist
          byCategory={checklist.byCategory}
          carriedOver={checklist.carriedOver}
          extras={checklist.extras}
          readOnly
        />
      </section>
    </div>
  );
}
