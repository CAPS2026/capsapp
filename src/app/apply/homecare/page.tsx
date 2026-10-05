import { redirect } from "next/navigation";

// There is now ONE public form (/apply/volunteer). This old address just
// opens it with volunteering unticked, for anyone who saved the link.
export default function ApplyHomecareRedirect() {
  redirect("/apply/volunteer?for=homecare");
}
