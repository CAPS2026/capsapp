import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { futureRosterSlots, getStaffMember } from "@/lib/shift-people-data";
import { LoginInviteButton, RemoveStaffButton, StaffForm } from "@/components/shift/staff-form";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift/roster");

  const { id } = await params;
  const [member, slots] = await Promise.all([getStaffMember(id), futureRosterSlots(id)]);
  if (!member) notFound();
  const name = `${member.firstName} ${member.surname}`.trim();
  const isSelf = me.id === member.id;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link href="/shift/staff" className="text-sm font-semibold text-brand-ink">
          &larr; Staff
        </Link>
        <h1 className="m-0 text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {name}
        </h1>
      </header>

      <StaffForm key={member.id} member={member} isSelf={isSelf} />

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Login
        </h2>
        <LoginInviteButton id={member.id} email={member.email} hasLogin={member.hasLogin} />
      </section>

      {!isSelf && (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Remove
          </h2>
          <RemoveStaffButton id={member.id} name={member.firstName} futureSlots={slots} />
        </section>
      )}
    </div>
  );
}
