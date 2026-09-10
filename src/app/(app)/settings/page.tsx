import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { staffPinIsSet } from "@/lib/actions/cafe";
import { StaffPinForm } from "@/components/settings/staff-pin-form";

export default async function SettingsPage() {
  const person = await getCurrentPerson();
  if (!person?.isAdmin) redirect("/dogs");

  const pinIsSet = await staffPinIsSet();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Settings
      </h1>

      <section className="bg-card border border-line rounded-[var(--radius)] p-4 flex flex-col gap-3">
        <h2 className="font-bold">Staff PIN</h2>
        <StaffPinForm pinIsSet={pinIsSet} />
      </section>
    </div>
  );
}
