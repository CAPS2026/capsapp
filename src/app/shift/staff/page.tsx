import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { listStaff, type StaffRole } from "@/lib/shift-people-data";
import { PersonAvatar } from "@/components/shift/person-avatar";

const ROLE_SHORT: Record<StaffRole, string> = { staff: "Caretaker", admin: "Admin", volunteer: "Volunteer" };

/** Admin only: everyone who is a caretaker or an admin, with Add, and Edit
 *  / Remove on each person. */
export default async function StaffPage() {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift/roster");

  const staff = await listStaff();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
            &larr; Roster
          </Link>
          <h1 className="m-0 text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Staff
          </h1>
        </div>
        <Link href="/shift/staff/new" className="inline-flex h-11 items-center rounded-[var(--radius)] bg-brand px-5 text-sm font-bold text-white">
          Add staff member
        </Link>
      </header>

      {staff.length === 0 && <p className="m-0 text-sm text-ink-muted">Nobody yet.</p>}
      <div className="flex flex-col gap-2">
        {staff.map((p) => (
          <Link
            key={p.id}
            href={`/shift/staff/${p.id}`}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-card p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar name={p.name} size={34} />
              <div className="min-w-0">
                <p className="m-0 text-sm font-extrabold">{p.name}</p>
                <p className="m-0 truncate text-xs text-ink-muted">{p.email ?? "No email"}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-xs font-bold">{p.roles.map((r) => ROLE_SHORT[r]).join(", ")}</span>
              {!p.hasLogin && <span className="text-xs font-bold text-warm-ink">No login yet</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
