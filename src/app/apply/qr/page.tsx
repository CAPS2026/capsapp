import QRCode from "qrcode";
import Image from "next/image";
import { siteUrl } from "@/lib/email";
import { PrintButton } from "@/components/apply/print-button";

// Printable QR codes for the two public forms, to put up around the site
// (Paul, 2026-10-04). The short links /volunteer and /homecare redirect to
// the real form pages, so the printed codes never need to change if a page
// moves. The one thing that WOULD invalidate them is the web address itself —
// when the app gets its own domain, reprint from this page.
export const dynamic = "force-dynamic";

async function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, width: 280, errorCorrectionLevel: "M" });
}

export default async function QrPage() {
  const base = siteUrl();
  const forms = [
    { title: "Volunteer with CAPS", blurb: "Scan to register as a volunteer.", url: `${base}/volunteer` },
    { title: "Foster or Jail Break", blurb: "Scan to apply to foster or take a dog on a jail break.", url: `${base}/homecare` },
  ];
  const svgs = await Promise.all(forms.map((f) => qrSvg(f.url)));

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            QR codes for the forms
          </h1>
          <PrintButton />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {forms.map((f, i) => (
            <section
              key={f.url}
              className="flex flex-col items-center gap-3 text-center border border-line rounded-[var(--radius)] bg-card p-6 break-inside-avoid"
            >
              <Image src="/logo.jpg" alt="CAPS" width={56} height={56} className="rounded-full" />
              <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {f.title}
              </h2>
              <div className="w-56 h-56" dangerouslySetInnerHTML={{ __html: svgs[i] }} />
              <p className="text-sm text-ink">{f.blurb}</p>
              <p className="text-xs text-ink break-all">{f.url}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
