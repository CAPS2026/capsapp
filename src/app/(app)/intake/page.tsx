import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { IntakeForm } from "@/components/intake/intake-form";

// Staff-only dog intake (the paper "Animal Intake Record"). Volunteers and
// anyone in volunteer mode are sent back to the dog list.
export default async function IntakePage() {
  const me = await getCurrentPerson();
  if (!me?.isStaff) redirect("/dogs");

  // Weipa time (UTC+10), so an evening intake isn't dated the day before.
  const today = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Dog intake
      </h1>
      <IntakeForm officerName={`${me.firstName} ${me.surname}`.trim()} today={today} />
    </div>
  );
}
