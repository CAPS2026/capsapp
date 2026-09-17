import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { AddStaffForm } from "@/components/people/add-staff-form";

export default async function AddStaffPage() {
  const person = await getCurrentPerson();
  if (!person?.isAdmin) redirect("/people");

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
        ← Roster
      </Link>
      <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Add staff member
      </h1>
      <p className="text-sm text-ink-muted -mt-2">
        For people who need Staff-area access directly — not the public registration form.
      </p>

      <AddStaffForm />
    </div>
  );
}
