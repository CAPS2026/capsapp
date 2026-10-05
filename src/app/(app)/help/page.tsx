import { getCurrentPerson } from "@/lib/auth";
import { HelpSearch } from "@/components/help/help-search";

// How-to guides with a search box (Paul, 2026-10-04). Everyone signed in can
// open it; the guides they see depend on their access.
export default async function HelpPage() {
  const person = await getCurrentPerson();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Help
      </h1>
      <HelpSearch
        viewer={{
          isStaff: Boolean(person?.isStaff),
          canKiosk: Boolean(person?.canKiosk),
          isAdmin: Boolean(person?.isAdmin),
        }}
      />
    </div>
  );
}
