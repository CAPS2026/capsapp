import { createClient } from "@/lib/supabase/server";
import { getDogsListData } from "@/lib/dogs-data";
import { formatFullDateTime } from "@/lib/format";

export type ReportTable = {
  key: string;
  title: string;
  note?: string;
  columns: string[];
  rows: Record<string, string>[];
};

const DAY = 86_400_000;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}
function agoLabel(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return "never walked";
  if (d <= 0) return "today";
  return d === 1 ? "1 day ago" : `${d} days ago`;
}
const TYPE_LABEL: Record<string, string> = {
  walk: "Walking",
  yard: "Yard",
  bed_rest: "Bed rest",
  jail_break: "Jail break",
  foster: "Foster",
};

export async function getReports(): Promise<ReportTable[]> {
  const { dogs, orgSettings } = await getDogsListData();
  const supabase = await createClient();

  // ---- Needs a walk -------------------------------------------------------
  const needsWalk = dogs
    .filter(
      (d) =>
        d.status === "available" &&
        (d.lastWalkAt === null || (daysSince(d.lastWalkAt) ?? 0) >= orgSettings.needsWalkAfterDays),
    )
    .sort((a, b) => {
      if (!a.lastWalkAt) return -1;
      if (!b.lastWalkAt) return 1;
      return a.lastWalkAt.localeCompare(b.lastWalkAt); // oldest first
    });

  // ---- Currently out ----------------------------------------------------
  const out = dogs
    .filter((d) => d.status !== "available" && d.current)
    .sort((a, b) => (a.current!.startedAt < b.current!.startedAt ? -1 : 1));

  // ---- Homecare load --------------------------------------------------
  const homecare = out.filter(
    (d) => d.current!.type === "jail_break" || d.current!.type === "foster",
  );

  // ---- Length of stay ------------------------------------------------
  const { data: stayRows } = await supabase
    .from("dogs")
    .select("ref, name, arrival_date")
    .neq("status", "exited");
  const stay = ((stayRows ?? []) as { ref: string; name: string; arrival_date: string | null }[])
    .map((d) => ({ ...d, days: daysSince(d.arrival_date) }))
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

  return [
    {
      key: "needs-walk",
      title: "Needs a walk",
      note: `Available dogs not walked in ${orgSettings.needsWalkAfterDays}+ days, longest first.`,
      columns: ["Dog", "Ref", "Last walk"],
      rows: needsWalk.map((d) => ({ Dog: d.name, Ref: d.ref, "Last walk": agoLabel(d.lastWalkAt) })),
    },
    {
      key: "currently-out",
      title: "Currently out",
      columns: ["Dog", "What", "With", "Since", "Due back"],
      rows: out.map((d) => ({
        Dog: d.name,
        What: TYPE_LABEL[d.current!.type] ?? d.current!.type,
        With: d.current!.personName ?? (d.current!.reason ?? ""),
        Since: formatFullDateTime(d.current!.startedAt),
        "Due back": d.current!.dueBack ? formatFullDateTime(d.current!.dueBack) : "",
      })),
    },
    {
      key: "homecare-load",
      title: "Homecare load",
      note: "Dogs currently in jail break or foster care.",
      columns: ["Carer", "Program", "Dog", "Since", "Due back"],
      rows: homecare.map((d) => ({
        Carer: d.current!.personName ?? "",
        Program: TYPE_LABEL[d.current!.type] ?? d.current!.type,
        Dog: d.name,
        Since: formatFullDateTime(d.current!.startedAt),
        "Due back": d.current!.dueBack ? formatFullDateTime(d.current!.dueBack) : "",
      })),
    },
    {
      key: "length-of-stay",
      title: "Length of stay",
      note: "Dogs currently at CAPS, longest first.",
      columns: ["Dog", "Ref", "Arrived", "Days with CAPS"],
      rows: stay.map((d) => ({
        Dog: d.name,
        Ref: d.ref,
        Arrived: d.arrival_date ?? "",
        "Days with CAPS": d.days === null ? "unknown" : String(d.days),
      })),
    },
  ];
}
