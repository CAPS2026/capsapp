import Image from "next/image";
import { ApplyShell } from "@/components/apply/apply-shell";

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
            {homecareFirst ? "Foster or Jail Break with CAPS" : "Work with us"}
          </h1>
        </div>

        <ApplyShell
          homecareFirst={homecareFirst}
          intro={
            homecareFirst
              ? "Give a dog a break from the shelter — for a day, a weekend, or longer. Applications are reviewed by CAPS before you can take a dog out."
              : "There are many ways you can work with CAPS and support the animals in our care. Select your interests below. It's easy to change your mind and add more later."
          }
        />
      </div>
    </main>
  );
}
