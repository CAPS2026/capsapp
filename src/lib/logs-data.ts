import { createClient } from "@/lib/supabase/server";
import { formatDuration, formatLogDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/people";
import type { Role } from "@/lib/auth";
import type { LogFilters, LogTab, LogTable } from "@/lib/logs";

const LIMIT = 500;

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dayStart(d?: string) {
  return d ? `${d}T00:00:00` : null;
}
function dayEnd(d?: string) {
  return d ? `${d}T23:59:59.999` : null;
}

const ACTIVITY_TYPE: Record<
  Exclude<LogTab, "medical" | "site" | "dogs" | "people">,
  string[]
> = {
  walks: ["walk"],
  homecare: ["jail_break", "foster"],
  yard: ["yard"],
  bed_rest: ["bed_rest"],
};

async function activityLog(tab: keyof typeof ACTIVITY_TYPE, f: LogFilters): Promise<LogTable> {
  const supabase = await createClient();
  let q = supabase
    .from("dog_activity")
    .select(
      "id, type, started_at, ended_at, reason, entered_late, edited_at, dog:dogs!dog_activity_dog_id_fkey(name), person:people!dog_activity_person_id_fkey(first_name, surname)",
    )
    .in("type", ACTIVITY_TYPE[tab])
    .order("started_at", { ascending: false })
    .limit(LIMIT + 1);

  const from = dayStart(f.from);
  const to = dayEnd(f.to);
  if (from) q = q.gte("started_at", from);
  if (to) q = q.lte("started_at", to);
  if (f.dogId) q = q.eq("dog_id", f.dogId);
  if (f.personId) q = q.eq("person_id", f.personId);

  const { data } = await q;
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    type: string;
    started_at: string;
    ended_at: string | null;
    reason: string | null;
    entered_late: boolean;
    edited_at: string | null;
    dog: { name: string } | null;
    person: { first_name: string; surname: string } | null;
  }>;

  const capped = raw.length > LIMIT;
  const columns =
    tab === "homecare"
      ? ["Dog", "Type", "Carer", "Out", "In", "Duration", "Reason", "Flags"]
      : ["Dog", tab === "walks" ? "Walker" : "Person", "Out", "In", "Duration", "Reason", "Flags"];

  const rows = raw.slice(0, LIMIT).map((r) => {
    const person = r.person ? `${r.person.first_name} ${r.person.surname}` : "";
    const base: Record<string, string> = {
      Dog: r.dog?.name ?? "",
      Out: formatLogDateTime(r.started_at),
      In: r.ended_at ? formatLogDateTime(r.ended_at) : "(still out)",
      Duration: r.ended_at ? formatDuration(r.started_at, r.ended_at) : "",
      Reason: r.reason ?? "",
      Flags: [r.entered_late && "late", r.edited_at && "edited"].filter(Boolean).join(", "),
    };
    if (tab === "homecare") {
      base.Type = r.type === "jail_break" ? "Jail break" : "Foster";
      base.Carer = person;
    } else {
      base[tab === "walks" ? "Walker" : "Person"] = person;
    }
    return base;
  });

  return { columns, rows, capped };
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

  const { data } = await q;
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

  const { data } = await q;
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

  const { data } = await q;
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

  const { data } = await q;
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
  return activityLog(tab, filters);
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
