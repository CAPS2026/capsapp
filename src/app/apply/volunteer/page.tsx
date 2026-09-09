import Image from "next/image";
import { VolunteerForm } from "@/components/apply/volunteer-form";

// Public, self-service registration (docs/ui-flows.md §7). One form per
// person, first time round — there is no staff "quick add" (Paul,
// 2026-09-09). The homecare section slots in here in a later slice.
export default function ApplyVolunteerPage() {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.jpg" alt="CAPS" width={72} height={72} className="rounded-full" priority />
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Volunteer with CAPS
          </h1>
          <p className="text-sm text-ink-muted max-w-sm">
            Register once and you can start helping at the shelter. Adults can begin dog
            walking straight away; under-18s need a parent or guardian&apos;s consent first.
          </p>
        </div>

        <div className="bg-card border border-line rounded-[var(--radius)] p-5">
          <VolunteerForm />
        </div>

        <p className="text-xs text-ink-muted text-center">
          Already registered?{" "}
          <a href="/login" className="text-brand-ink underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
