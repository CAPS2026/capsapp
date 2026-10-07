import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { IntakeForm } from "@/components/intake/intake-form";

// Dog intake (the paper "Animal Intake Record"), completed by an admin because it
// carries their sign-off. Everyone else is sent back to the dog list; staff and
// admin can read the result on the dog's page.
export default async function IntakePage() {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/dogs");

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
