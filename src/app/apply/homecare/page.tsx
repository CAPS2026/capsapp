import Image from "next/image";
import { HomecarePublicForm } from "@/components/apply/homecare-public-form";

// Public homecare (fostering / jail break) application — the page behind the
// QR code and the short link /homecare. Already-registered volunteers only
// give their home details; anyone new is sent to the one registration form.
export default function ApplyHomecarePublicPage() {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.jpg" alt="CAPS" width={72} height={72} className="rounded-full" priority />
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Foster or Jail Break with CAPS
          </h1>
          <p className="text-sm text-ink max-w-sm">
            Give a dog a break from the shelter — for a day, a weekend, or longer. Applications are reviewed by
            CAPS before you can take a dog out.
          </p>
        </div>

        <div className="bg-card border border-line rounded-[var(--radius)] p-5">
          <HomecarePublicForm />
        </div>
      </div>
    </main>
  );
}
