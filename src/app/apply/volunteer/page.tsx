import Image from "next/image";
import { VolunteerForm } from "@/components/apply/volunteer-form";

// The ONE public form (docs/ui-flows.md §7, Paul 2026-10-05): volunteering at
// the shelter, fostering, jail break, or any mix. /volunteer and /homecare
// (the printed QR codes) both land here; /homecare just opens with
// volunteering unticked.
export default async function ApplyVolunteerPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: audience } = await searchParams;
  const homecareFirst = audience === "homecare";

  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.jpg" alt="CAPS" width={72} height={72} className="rounded-full" priority />
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            {homecareFirst ? "Foster or Jail Break with CAPS" : "Join CAPS"}
          </h1>
          <p className="text-sm text-ink max-w-sm">
            {homecareFirst
              ? "Give a dog a break from the shelter — for a day, a weekend, or longer. Applications are reviewed by CAPS before you can take a dog out."
              : "Volunteer at the shelter, foster a dog, or take one out on a jail break — one short form covers it all. Adults can begin dog walking straight away; under-18s need a parent or guardian's consent first."}
          </p>
        </div>

        <div className="bg-card border border-line rounded-[var(--radius)] p-5">
          <VolunteerForm homecareFirst={homecareFirst} />
        </div>

        <p className="text-xs text-ink text-center">
          Already registered? You&apos;re good to go — check in with a caretaker when you&apos;re at the shelter.
        </p>
      </div>
    </main>
  );
}
