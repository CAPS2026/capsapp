import { createClient } from "@/lib/supabase/server";
import { formatDuration, formatLogDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/people";
import type { Role } from "@/lib/auth";
import type { LogFilters, LogTab, LogTable } from "@/lib/logs";

const LIMIT = 500;

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// The shelter is in Weipa (Queensland, UTC+10, no daylight saving). A bare
// "YYYY-MM-DDT00:00:00" is read as UTC by the database, which put a local
// day's early-morning walks in the previous day, so day boundaries carry the
// +10:00 offset explicitly.
function dayStart(d?: string) {
  return d ? `${d}T00:00:00+10:00` : null;
}
function dayEnd(d?: string) {
  return d ? `${d}T23:59:59.999+10:00` : null;
}

const ACTIVITY_TYPE: Record<string, string[]> = {
  activity: ["walk", "yard", "bed_rest", "jail_break", "foster"],
  walks: ["walk"],
  jail_break: ["jail_break"],
  foster: ["foster"],
  homecare: ["jail_break", "foster"],
  yard: ["yard"],
  bed_rest: ["bed_rest"],
};

const TYPE_LABEL: Record<string, string> = {
  walk: "Walk",
  yard: "Yard",
  bed_rest: "Bed Rest",
  jail_break: "Jail Break",
  foster: "Foster",
};

async function activityLog(tab: keyof typeof ACTIVITY_TYPE, f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  // On the All activity tab the type chips narrow it; the other tabs are fixed.
  const types =
    tab === "activity" && f.types && f.types.length > 0
      ? f.types.filter((t) => ACTIVITY_TYPE.activity.includes(t))
      : ACTIVITY_TYPE[tab];

  let q = supabase
    .from("dog_activity")
    .select(
      "id, type, started_at, ended_at, due_back, reason, notes, entered_late, edited_at, dog:dogs!dog_activity_dog_id_fkey(name), person:people!dog_activity_person_id_fkey(first_name, surname)",
    )
    .in("type", types)
    .order("started_at", { ascending: false })
    .limit(LIMIT + 1);

  const from = dayStart(f.from);
  const to = dayEnd(f.to);
  if (from) q = q.gte("started_at", from);
  if (to) q = q.lte("started_at", to);
  if (f.dogId) q = q.eq("dog_id", f.dogId);
  if (f.personId) q = q.eq("person_id", f.personId);
  if (f.status === "open") q = q.is("ended_at", null);
  if (f.status === "closed") q = q.not("ended_at", "is", null);
  if (f.flag === "late") q = q.eq("entered_late", true);
  if (f.flag === "edited") q = q.not("edited_at", "is", null);
  const text = (f.q ?? "").trim().replace(/[%,()]/g, " ");
  if (text) q = q.or(`reason.ilike.%${text}%,notes.ilike.%${text}%`);

  const { data, error } = await q;
  if (error) console.error("logs-data query failed", error);
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    type: string;
    started_at: string;
    ended_at: string | null;
    due_back: string | null;
    reason: string | null;
    notes: string | null;
    entered_late: boolean;
    edited_at: string | null;
    dog: { name: string } | null;
    person: { first_name: string; surname: string } | null;
  }>;

  const capped = raw.length > LIMIT;
  const showType = types.length > 1;
  const personLabel =
    tab === "walks" ? "Walker" : tab === "jail_break" || tab === "foster" || tab === "homecare" ? "Carer" : "Person";
  const columns = ["Dog", ...(showType ? ["Type"] : []), personLabel, "Out", "In", "Duration", "Notes", "Flags"];

  const kept = raw.slice(0, LIMIT);
  let minutes = 0;
  const dogs = new Set<string>();
  const rows = kept.map((r) => {
    const person = r.person ? `${r.person.first_name} ${r.person.surname}` : "";
    if (r.ended_at) minutes += Math.max(0, (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60_000);
    if (r.dog?.name) dogs.add(r.dog.name);
    const overdue = !r.ended_at && r.due_back && new Date(r.due_back) < new Date();
    const row: Record<string, string> = {
      Dog: r.dog?.name ?? "",
      Out: formatLogDateTime(r.started_at),
      In: r.ended_at ? formatLogDateTime(r.ended_at) : "(still out)",
      Duration: r.ended_at ? formatDuration(r.started_at, r.ended_at) : "",
      Notes: [r.reason, r.notes].filter(Boolean).join(" · "),
      Flags: [r.entered_late && "late", r.edited_at && "edited", overdue && "overdue"].filter(Boolean).join(", "),
    };
    if (showType) row.Type = TYPE_LABEL[r.type] ?? r.type;
    row[personLabel] = person;
    return row;
  });

  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const summary = rows.length
    ? `${rows.length}${capped ? "+" : ""} record${rows.length === 1 ? "" : "s"} · ${h > 0 ? `${h}h ` : ""}${m}m total (returned only) · ${dogs.size} dog${dogs.size === 1 ? "" : "s"}`
    : undefined;

  return { columns, rows, capped, summary };
}

async function medicalLog(f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  let q = supabase
    .from("medical_events")
    .select("id, event_date, type, detail, vet, dog:dogs!medical_events_dog_id_fkey(name)")
    .order("event_date", { ascending: false })
    .limit(LIMIT + 1);

  if (f.from) q = q.gte("event_date", f.from);
  if (f.to) q = q.lte("event_date", f.to);
  if (f.dogId) q = q.eq("dog_id", f.dogId);

  const { data, error } = await q;
  if (error) console.error("logs-data query failed", error);
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    event_date: string;
    type: string;
    detail: string;
    vet: string | null;
    dog: { name: string } | null;
  }>;

  return {
    columns: ["Dog", "Date", "Type", "Detail", "Vet"],
    rows: raw.slice(0, LIMIT).map((r) => ({
      Dog: r.dog?.name ?? "",
      Date: r.event_date,
      Type: r.type,
      Detail: r.detail,
      Vet: r.vet ?? "",
    })),
    capped: raw.length > LIMIT,
  };
}

async function siteLog(f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  let q = supabase
    .from("site_visits")
    .select(
      "id, checked_in, checked_out, reason, reason_other, guest_name, person:people!site_visits_person_id_fkey(first_name, surname), reason_ref:site_visit_reason!site_visits_reason_fkey(label)",
    )
    .order("checked_in", { ascending: false })
    .limit(LIMIT + 1);

  const from = dayStart(f.from);
  const to = dayEnd(f.to);
  if (from) q = q.gte("checked_in", from);
  if (to) q = q.lte("checked_in", to);
  if (f.personId) q = q.eq("person_id", f.personId);

  const { data, error } = await q;
  if (error) console.error("logs-data query failed", error);
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    checked_in: string;
    checked_out: string | null;
    reason: string;
    reason_other: string | null;
    guest_name: string | null;
    person: { first_name: string; surname: string } | null;
    reason_ref: { label: string } | null;
  }>;

  return {
    columns: ["Who", "In", "Out", "Reason"],
    rows: raw.slice(0, LIMIT).map((r) => ({
      Who: r.person ? `${r.person.first_name} ${r.person.surname}` : (r.guest_name ?? "Guest"),
      In: formatLogDateTime(r.checked_in),
      Out: r.checked_out ? formatLogDateTime(r.checked_out) : "(on site)",
      Reason:
        r.reason === "other" && r.reason_other ? r.reason_other : (r.reason_ref?.label ?? r.reason),
    })),
    capped: raw.length > LIMIT,
  };
}

async function dogsLog(f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  let q = supabase
    .from("dogs")
    .select("id, ref, name, breed, status, arrival_date, arrival_type, exit_date, exit_type")
    .order("arrival_date", { ascending: false, nullsFirst: false })
    .limit(LIMIT + 1);
  if (f.from) q = q.gte("arrival_date", f.from);
  if (f.to) q = q.lte("arrival_date", f.to);

  const { data, error } = await q;
  if (error) console.error("logs-data query failed", error);
  const raw = (data ?? []) as unknown as Array<{
    ref: string;
    name: string;
    breed: string | null;
    status: string;
    arrival_date: string | null;
    arrival_type: string | null;
    exit_date: string | null;
    exit_type: string | null;
  }>;

  return {
    columns: ["Ref", "Name", "Breed", "Status", "Arrived", "How", "Exited", "Exit reason"],
    rows: raw.slice(0, LIMIT).map((d) => ({
      Ref: d.ref,
      Name: d.name,
      Breed: d.breed ?? "",
      Status: titleCase(d.status),
      Arrived: d.arrival_date ?? "",
      How: d.arrival_type ? titleCase(d.arrival_type) : "",
      Exited: d.exit_date ?? "",
      "Exit reason": d.exit_type ? titleCase(d.exit_type) : "",
    })),
    capped: raw.length > LIMIT,
  };
}

async function peopleLog(f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  let q = supabase
    .from("people")
    .select(
      "id, first_name, surname, email, phone, created_at, auth_user_id, person_roles!person_roles_person_id_fkey(role, status)",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT + 1);
  const from = dayStart(f.from);
  const to = dayEnd(f.to);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data, error } = await q;
  if (error) console.error("logs-data query failed", error);
  const raw = (data ?? []) as unknown as Array<{
    first_name: string;
    surname: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    auth_user_id: string | null;
    person_roles: { role: Role; status: string }[] | null;
  }>;

  return {
    columns: ["Name", "Roles", "Email", "Phone", "Account", "Registered"],
    rows: raw.slice(0, LIMIT).map((p) => ({
      Name: `${p.first_name} ${p.surname}`,
      Roles: (p.person_roles ?? [])
        .filter((r) => r.status === "active" || r.status === "pending")
        .map((r) => `${ROLE_LABEL[r.role]}${r.status === "pending" ? " (pending)" : ""}`)
        .join(", "),
      Email: p.email ?? "",
      Phone: p.phone ?? "",
      Account: p.auth_user_id ? "Yes" : "",
      Registered: p.created_at.slice(0, 10),
    })),
    capped: raw.length > LIMIT,
  };
}

export async function getLog(tab: LogTab, filters: LogFilters): Promise<LogTable> {
  if (tab === "medical") return medicalLog(filters);
  if (tab === "site") return siteLog(filters);
  if (tab === "dogs") return dogsLog(filters);
  if (tab === "people") return peopleLog(filters);
  return activityLog(tab as keyof typeof ACTIVITY_TYPE, filters);
}

export async function getLogFilterOptions(): Promise<{
  dogs: { id: string; name: string }[];
  people: { id: string; name: string }[];
}> {
  const supabase = await createClient();
  const [{ data: dogs }, { data: people }] = await Promise.all([
    supabase.from("dogs").select("id, name").order("name"),
    supabase.from("people").select("id, first_name, surname").order("surname").order("first_name"),
  ]);
  return {
    dogs: (dogs ?? []).map((d) => ({ id: d.id, name: d.name })),
    people: (people ?? []).map((p) => ({ id: p.id, name: `${p.first_name} ${p.surname}` })),
  };
}
