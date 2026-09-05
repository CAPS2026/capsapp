import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Image
        src="/logo.jpg"
        alt="CAPS — Cape Animal Protection Shelter"
        width={120}
        height={120}
        className="rounded-full"
        priority
      />
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        CAPS App
      </h1>
      <p className="text-ink-muted max-w-sm">
        Cape Animal Protection Shelter — dogs, volunteers &amp; homecare.
        Under construction.
      </p>
      <Link
        href="/login"
        className="mt-2 h-11 px-6 inline-flex items-center rounded-[var(--radius)] bg-brand text-white font-bold"
      >
        Staff &amp; volunteer sign in
      </Link>
    </main>
  );
}
