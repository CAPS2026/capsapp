export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand text-white text-2xl font-extrabold">
        C
      </span>
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        CAPS App
      </h1>
      <p className="text-ink-muted max-w-sm">
        Cape Animal Protection Shelter — dogs, volunteers &amp; homecare.
        Under construction.
      </p>
    </main>
  );
}
