import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPersonDetail } from "@/lib/person-detail";
import { ApplyHomecareForm } from "@/components/people/apply-homecare-form";

// Where "Add jail break carer / Add foster carer" in a person's Update
// status menu lands. Staff only.
export default async function ApplyHomecarePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ program?: string }>;
}) {
  const { id } = await params;
  const { program } = await searchParams;
  const viewer = await getCurrentPerson();
  if (!viewer?.isStaff) redirect("/dogs");

  const person = await getPersonDetail(id);
  if (!person) notFound();

  const holds = (role: string) =>
    person.roles.some((r) => r.role === role && (r.status === "active" || r.status === "pending"));

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href={`/people/${id}`} className="text-sm font-semibold text-brand-ink">
        ← {person.firstName} {person.surname}
      </Link>
      <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Homecare application
      </h1>
      <ApplyHomecareForm
        personId={id}
        personName={`${person.firstName} ${person.surname}`}
        hasEmail={!!person.email}
        alreadyJailBreak={holds("jailbreak_carer")}
        alreadyFoster={holds("foster_carer")}
        initialProgram={program === "foster" ? "foster" : program === "jail_break" ? "jail_break" : null}
      />
    </div>
  );
}
