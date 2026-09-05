import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();
  if (!person) redirect("/login");

  return <AppShell person={person}>{children}</AppShell>;
}
