import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { exitTypeLabel } from "@/lib/dog-exit";

// The archive: every dog that has left CAPS, newest exit first.
export default async function ExitedDogsPage() {
  const person = await getCurrentPerson();
  if (!person?.isStaff) notFound();

  const supabase = await createClient();
  const { data: dogs, error } = await supabase
    .from("dogs")
    .select("id, ref, name, exit_date, exit_type, exit_notes, exit_person_id")
    .eq("status", "exited")
    .order("exit_date", { ascending: false, nullsFirst: false });
  if (error) console.error("ExitedDogsPage: read failed", error);

  const personIds = Array.from(new Set((dogs ?? []).map((d) => d.exit_person_id).filter((id): id is string => !!id)));
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, first_name, surname").in("id", personIds)
    : { data: [] as { id: string; first_name: string; surname: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, `${p.first_name} ${p.surname}`.trim()]));

  return (
    <div className="flex flex-col gap-3 p-4 pb-8">
      <Link href="/dogs" className="text-sm font-semibold text-brand-ink">
        ← Dogs
      </Link>
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Exited dogs
      </h1>
      {(dogs ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No dogs have been exited yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border border-line rounded-[var(--radius)] bg-card">
          {(dogs ?? []).map((d) => (
            <li key={d.id}>
              <Link href={`/dogs/${d.id}`} className="flex flex-col px-3 py-2.5 hover:bg-gray-tint">
                <span className="font-semibold">
                  {d.name} <span className="text-sm font-normal text-ink-muted">{d.ref}</span>
                </span>
                <span className="text-sm text-ink-muted">
                  {exitTypeLabel(d.exit_type)}
                  {d.exit_date ? ` · ${formatDate(d.exit_date)}` : ""}
                  {d.exit_person_id && nameById.get(d.exit_person_id) ? ` · ${nameById.get(d.exit_person_id)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
