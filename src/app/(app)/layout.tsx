import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { staffPinIsSet } from "@/lib/actions/cafe";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  // Only relevant for the "Hand over" prompt, which only staff see.
  const pinIsSet = person.isStaff ? await staffPinIsSet() : false;

  return (
    <AppShell person={person} pinIsSet={pinIsSet}>
      {children}
    </AppShell>
  );
}
