import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";

// Overrides the root layout's manifest for everything under /shift, so
// this installs to the tablet's home screen as its own "CAPS Staff" icon,
// separate from "CAPS App" (the dog side). Same login underneath either
// way. Next.js merges metadata down the tree; a field set here wins over
// the root layout's for this subtree without touching that file.
export const metadata: Metadata = {
  title: "CAPS Staff",
  description: "Shift sign-in, checklist and handover.",
  manifest: "/shift-manifest.json",
};

export default async function ShiftLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/login");

  return <div className="min-h-screen bg-background">{children}</div>;
}
