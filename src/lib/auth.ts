import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CAFE_COOKIE } from "@/lib/cafe";

export type Role =
  | "volunteer"
  | "volunteer_plus"
  | "jailbreak_carer"
  | "foster_carer"
  | "adopter"
  | "staff"
  | "committee"
  | "admin";

export interface CurrentPerson {
  /** Empty string if signed in but not yet linked to a `people` row. */
  id: string;
  firstName: string;
  surname: string;
  email: string | null;
  roles: Role[];
  /**
   * Staff and committee get the same access in v1 (see docs/schema.md §11).
   * Everything the app gates as "staff" is available to staff, committee
   * and admin.
   */
  isStaff: boolean;
  /**
   * Admin — a superset of staff. Gates the structural / irreversible /
   * security operations regular staff shouldn't do: deleting people or
   * dogs, merging duplicates, the café-mode PIN, granting kiosk access.
   * The staff/admin split is deliberately light in v1.
   */
  isAdmin: boolean;
  /** Experienced volunteer who signs in themselves (`volunteer_plus`). */
  isVolunteerPlus: boolean;
  /**
   * Can operate kiosk mode for walks + yard — check people in/out on
   * behalf of others. True for staff and Volunteer Plus. Placements
   * (bed rest / jail break / foster) stay staff-only.
   */
  canKiosk: boolean;
  /**
   * This device is in café mode — a staff account handed it to volunteers
   * (see src/lib/cafe.ts). While true, isStaff/isAdmin are forced false
   * (limited surface) but canKiosk stays true so walks + yard check in/out
   * still work. Getting full access back needs the shared PIN.
   */
  cafeMode: boolean;
}

type PersonRoleRow = { role: Role; status: string };

/**
 * The signed-in person, or null if nobody's signed in. Safe to call from
 * Server Components and Route Handlers — reads via the RLS-respecting
 * server client, so it only ever sees what that person is allowed to see
 * (which, for their own `people` row, is everything relevant here).
 */
export async function getCurrentPerson(): Promise<CurrentPerson | null> {
  // Supabase env vars aren't wired into this environment yet (see
  // docs/setup-handover.md §2) — treat as signed-out rather than crash.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // `person_roles` has two FKs to `people` (person_id, approved_by) — the
  // embed needs the explicit constraint name or PostgREST can't tell which
  // relationship to use (PGRST201).
  const { data: person, error } = await supabase
    .from("people")
    .select("id, first_name, surname, email, person_roles!person_roles_person_id_fkey(role, status)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    // Don't silently fall through to a roleless account — that once masked
    // a broken embed for days (see project memory 2026-09-06).
    console.error("getCurrentPerson: people lookup failed", error);
  }

  if (!person) {
    // Signed in via Supabase Auth, but no `people` row is linked yet —
    // either the auth callback hasn't run the link step, or this email
    // never went through registration. Treat as a bare, roleless account.
    return {
      id: "",
      firstName: user.email?.split("@")[0] ?? "there",
      surname: "",
      email: user.email ?? null,
      roles: [],
      isStaff: false,
      isAdmin: false,
      isVolunteerPlus: false,
      canKiosk: false,
      cafeMode: false,
    };
  }

  const roles = ((person.person_roles as PersonRoleRow[] | null) ?? [])
    .filter((r) => r.status === "active")
    .map((r) => r.role);

  const realIsAdmin = roles.includes("admin");
  const realIsStaff = realIsAdmin || roles.includes("staff") || roles.includes("committee");
  const realIsPlus = roles.includes("volunteer_plus");

  // Café mode: a staff/admin account that handed this device to volunteers
  // is treated as Volunteer Plus until the PIN is re-entered — full kiosk
  // for walks + yard, nothing staff-only.
  const cafeMode = realIsStaff && (await cookies()).get(CAFE_COOKIE)?.value === "1";
  const isStaff = realIsStaff && !cafeMode;
  const isAdmin = realIsAdmin && !cafeMode;
  const isVolunteerPlus = realIsPlus || cafeMode;

  return {
    id: person.id,
    firstName: person.first_name,
    surname: person.surname,
    email: person.email,
    roles,
    isStaff,
    isAdmin,
    isVolunteerPlus,
    canKiosk: isStaff || isVolunteerPlus,
    cafeMode,
  };
}
