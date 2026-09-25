import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { StaffForm } from "@/components/shift/staff-form";

export default async function NewStaffPage() {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift/roster");

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/shift/staff" className="text-sm font-semibold text-brand-ink">
          &larr; Staff
        </Link>
        <h1 className="m-0 text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Add staff member
        </h1>
      </header>
      <p className="m-0 text-xs leading-relaxed text-ink-muted">
        Adding someone also sets up their login and emails them how to sign in.
      </p>
      <StaffForm />
    </div>
  );
}
