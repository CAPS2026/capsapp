import QRCode from "qrcode";
import Image from "next/image";
import { siteUrl } from "@/lib/email";
import { PrintButton } from "@/components/apply/print-button";

// Printable QR code for the one public form (Paul, 2026-10-05). The short link
// /volunteer redirects to the real form page, so a printed code never needs to
// change if the page moves. The one thing that WOULD invalidate it is the web
// address itself — when the app gets its own domain, reprint from this page.
export const dynamic = "force-dynamic";

async function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, width: 420, errorCorrectionLevel: "M" });
}

export default async function QrPage() {
  const svg = await qrSvg(`${siteUrl()}/volunteer`);

  return (
    <main className="flex-1 px-4 py-8 print:p-0">
      {/* margin 0 on the printed page stops the browser stamping its own date / address
          lines over the poster (turn "Headers and footers" off too if it still does). */}
      <style>{"@media print { @page { margin: 0; } }"}</style>
      <div className="max-w-md mx-auto flex flex-col gap-6 print:max-w-none">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            QR code for the form
          </h1>
          <PrintButton />
        </div>

        <section className="flex flex-col items-center gap-4 text-center border border-line rounded-[var(--radius)] bg-card p-8 break-inside-avoid print:border-0 print:min-h-screen print:justify-center">
          <Image src="/logo.jpg" alt="CAPS" width={96} height={96} className="rounded-full" />
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Register with CAPS
          </h2>
          <div className="w-72 h-72 print:w-96 print:h-96" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="text-base text-ink">Scan to volunteer, foster, take a dog on a jail break, or adopt.</p>
        </section>
      </div>
    </main>
  );
}
