import Image from "next/image";

// Public privacy policy (also linked from the Google sign-in consent screen).
// Plain-language description of what the CAPS app actually does with
// people's information. CAPS should review the wording before relying on it.
export const metadata = { title: "Privacy policy — CAPS App" };

const UPDATED = "5 October 2026";

export default function PrivacyPage() {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-5 text-sm leading-relaxed text-ink">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="CAPS" width={56} height={56} className="rounded-full" />
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              Privacy policy
            </h1>
            <p className="text-xs">Cape Animal Protection Shelter Inc. (CAPS) · Updated {UPDATED}</p>
          </div>
        </div>

        <p>
          This explains what the CAPS App collects about volunteers, carers, staff and visitors, why, and who can see
          it. The app runs the shelter&apos;s day-to-day work: looking after the dogs, signing people in and out, and
          looking after the people who help.
        </p>

        <h2 className="text-lg font-bold">What we collect</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <strong>When you register:</strong> your name, contact details, date of birth, address, emergency contact,
            relevant medical conditions, your experience with dogs, what you would like to help with, whether we may
            use your photo in promotion, and your agreement to our terms. For under-18s, a parent or guardian&apos;s
            name, phone, email and consent.
          </li>
          <li>
            <strong>If you apply to foster or take a dog on a jail break:</strong> details about your home and garden.
          </li>
          <li>
            <strong>Optionally:</strong> a photo of you.
          </li>
          <li>
            <strong>As you volunteer:</strong> which dogs you walk or look after and when, and when you sign in and out
            of the site.
          </li>
          <li>
            <strong>If you sign in with Google:</strong> only your email address and name, so we can match you to your
            registration. We don&apos;t see your Google password or anything else in your Google account.
          </li>
        </ul>

        <h2 className="text-lg font-bold">Why</h2>
        <p>
          To run the shelter safely: to know who is with our dogs, to contact you or your emergency contact if there is
          a problem, to approve people for roles such as fostering, and to keep records the shelter needs. We don&apos;t
          sell your information or use it for advertising.
        </p>

        <h2 className="text-lg font-bold">Who can see it</h2>
        <p>
          Your personal details are visible only to CAPS staff, committee members and administrators. Volunteers can see
          basic information about the dogs, not other people&apos;s personal details. Photos are used inside the app
          unless you said we may use them in promotion.
        </p>

        <h2 className="text-lg font-bold">Where it is kept</h2>
        <p>
          In a secure database hosted in Sydney, Australia (Supabase). The website runs on Vercel, and emails are sent
          through Resend. These providers handle data only to provide those services for us.
        </p>

        <h2 className="text-lg font-bold">Your choices</h2>
        <p>
          You can ask to see, correct or delete your information, or to stop us using your photo in promotion, by
          contacting us below. Some records, such as who handled a dog on a given day, may need to be kept for the
          shelter&apos;s own records.
        </p>

        <h2 className="text-lg font-bold">Contact</h2>
        <p>
          Cape Animal Protection Shelter Inc., Weipa, Queensland.
          <br />
          Email: info@capeanimalprotectionshelter.org.au
          <br />
          Phone: 0401 530 516
        </p>
      </div>
    </main>
  );
}
