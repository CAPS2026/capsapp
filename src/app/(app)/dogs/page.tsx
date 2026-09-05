import { getCurrentPerson } from "@/lib/auth";

// Slice 2 replaces this with the real status-grouped Dogs home base
// (docs/ui-flows.md §2). For now this proves the auth + role pipeline:
// sign-in, the people/person_roles join, and role-gated nav all work.
export default async function DogsPage() {
  const person = await getCurrentPerson();

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Dogs
      </h1>

      {person && !person.id ? (
        <div className="rounded-[var(--radius)] border border-warm bg-warm-tint p-4 text-sm">
          Signed in as <strong>{person.email}</strong>, but there&apos;s no CAPS
          registration on file for that email yet — nothing to show until a
          staff member links your account, or you register.
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-line bg-card p-4 text-sm flex flex-col gap-1">
          <p>
            Signed in as <strong>{person?.firstName} {person?.surname}</strong>
          </p>
          <p className="text-ink-muted">{person?.email}</p>
          <p className="text-ink-muted">
            Roles: {person?.roles.length ? person.roles.join(", ") : "none yet"}
          </p>
        </div>
      )}

      <p className="text-ink-muted text-sm">
        The status-grouped dogs list lands here in the next build slice.
      </p>
    </div>
  );
}
