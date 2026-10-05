// How-to articles for the Help tab. Plain data so it can be searched on the
// client. Keep each one short and written for someone at the shelter, using
// the exact button names they'll see. When a screen changes, update the
// matching article here.

export type Audience = "everyone" | "kiosk" | "staff" | "admin";

export type HelpArticle = {
  id: string;
  title: string;
  topic: "Walks & dogs" | "Visitors & sign-in" | "Registering" | "Out of the kennel" | "People" | "Records & reports" | "Modes & access";
  /** Who can see it: everyone, kiosk operators (staff or Volunteer +), staff, or admins. */
  audience: Audience;
  /** Extra words people might type that aren't in the title or steps. */
  keywords: string;
  intro?: string;
  steps: string[];
};

export const HELP_ARTICLES: HelpArticle[] = [
  // ---------------- Walks & dogs
  {
    id: "start-walk",
    title: "Start a walk",
    topic: "Walks & dogs",
    audience: "everyone",
    keywords: "take dog out check out begin walking green",
    steps: [
      "Open the Dogs tab and find the dog under Available.",
      "Tap the green Start Walk button on their card.",
      "On a shared device you'll be asked who's walking — pick the volunteer's name, then Start Walk. If you're signed in yourself it starts straight away with you as the walker.",
      "The dog moves up to Walking, with the time they went out.",
    ],
  },
  {
    id: "end-walk",
    title: "End a walk (bring a dog back in)",
    topic: "Walks & dogs",
    audience: "everyone",
    keywords: "return check in finish stop back blue",
    steps: [
      "On the Dogs tab find the dog under Walking and tap the blue End Walk button.",
      "That's it — the return time is now, and the dog goes back to Available.",
      "If the real return time was earlier, fix it: tap the dog, tap the walk record under Activity, then Edit times.",
    ],
  },
  {
    id: "manual-entry",
    title: "Log something that already happened (Manual entry)",
    topic: "Walks & dogs",
    audience: "everyone",
    keywords: "forgot forgotten backdate retrospective past late missed after the fact walk yard bed rest",
    intro: "Use this when nobody tapped Start or End at the time.",
    steps: [
      "On an Available dog tap the ⋯ button, then Manual entry. (Volunteers just see a Manual entry link.)",
      "Pick the Activity from the dropdown. Volunteers can log a walk for themselves; kiosk operators can also log Yard; staff can log any activity.",
      "Choose who (a walker, or an approved carer for Jail Break / Foster), then fill in Check Out and Check In.",
      "Add Notes if you like (required for Bed Rest) and tap Save. It's flagged \"late\" so it's clear it was entered afterwards.",
    ],
  },
  {
    id: "edit-times",
    title: "Fix the wrong time on a record (Edit times)",
    topic: "Walks & dogs",
    audience: "everyone",
    keywords: "correct change wrong time mistake edit",
    steps: [
      "Tap the dog, then tap the record under Activity.",
      "Tap Edit times, change Check Out / Check In and Save.",
      "Volunteers can edit their own records; staff can edit any. Edited records are flagged \"edited\".",
    ],
  },
  {
    id: "dog-card",
    title: "What the dog card tells you",
    topic: "Walks & dogs",
    audience: "everyone",
    keywords: "last walk 4wk time status colours overdue timer amber red",
    steps: [
      "Dogs are grouped by status: Walking, Yard, Available, Bed Rest, Jail Break, Foster.",
      "On an Available dog, \"Last walk\" is how long since they came back from a walk, and \"4wk time\" is the total walking time in the last four weeks.",
      "A timer turns amber, then red, when a walk or yard session runs long.",
      "A red End button and \"Overdue\" mean a due-back time has passed and the dog is still out.",
    ],
  },
  // ---------------- Visitors & sign-in
  {
    id: "visitor-sign-in",
    title: "Sign in as a visitor on site",
    topic: "Visitors & sign-in",
    audience: "everyone",
    keywords: "arrive check in site visit volunteer committee guest",
    steps: [
      "Open the Site Visitors tab and tap the blue Sign in button.",
      "Choose Registered person and pick your name, or Guest and type your name (and a phone number if you like).",
      "Pick the reason you're here and tap Sign in.",
    ],
  },
  {
    id: "visitor-sign-out",
    title: "Sign out when you leave",
    topic: "Visitors & sign-in",
    audience: "everyone",
    keywords: "leave check out going home",
    steps: ["On the Site Visitors tab find your name under Here now and tap the orange Sign out button."],
  },
  {
    id: "login",
    title: "Sign in to the app with an email code",
    topic: "Visitors & sign-in",
    audience: "everyone",
    keywords: "log in password login code email cant sign in locked out",
    intro: "Most volunteers never need to — a caretaker checks them in. Staff, committee and Volunteer + sign in themselves.",
    steps: [
      "Go to the sign-in page and type the email address CAPS has for you.",
      "We email you a code. Type it in.",
      "If it says you're not registered, ask a staff member to check the email on your record, or register first at capsapp-five.vercel.app/volunteer.",
    ],
  },
  // ---------------- Registering
  {
    id: "register-volunteer",
    title: "Join CAPS: volunteer, foster or jail break (one form)",
    topic: "Registering",
    audience: "everyone",
    keywords: "sign up join new application form qr code under 18 minor parent consent homecare foster jailbreak garden fence photo",
    steps: [
      "Scan the QR code at the shelter, or go to capsapp-five.vercel.app/volunteer.",
      "Tick what you're interested in: volunteering at the shelter, fostering, jail break — any mix — and give your email and surname.",
      "Already registered? We'll recognise you and only ask what's new (for fostering or jail break, just your home and garden details). Otherwise it's a few short pages: about you, an emergency contact, you and dogs, then your home if you ticked fostering or jail break.",
      "Under 18? A parent or guardian's name, phone, email and typed name are needed too. They'll be emailed a confirmation, and CAPS confirms before you start.",
      "On the last page you can add a photo if you like (optional), then agree to the terms and type your name to sign.",
      "Adults can start dog walking straight away; check in with a caretaker next time you're at the shelter. Fostering and jail break need CAPS approval first.",
    ],
  },
  // ---------------- Out of the kennel
  {
    id: "start-yard",
    title: "Start a yard session",
    topic: "Out of the kennel",
    audience: "kiosk",
    keywords: "yard 1 yard 2 outside play pen time",
    steps: [
      "On an Available dog tap ⋯ then Start Yard.",
      "Pick Yard 1 or Yard 2.",
      "Choose Due back in… (15 min to 4 hr) or Due back at… and set a time like 14:00 if the day is running late.",
      "Tap Start Yard. When the dog is back, tap End Yard.",
    ],
  },
  {
    id: "start-bed-rest",
    title: "Put a dog on bed rest",
    topic: "Out of the kennel",
    audience: "staff",
    keywords: "rest vet medication recover",
    steps: [
      "On an Available dog tap ⋯ then Start Bed Rest.",
      "Set Due End with the date and time pickers, or use the \"days from now\" dropdown for a quick date.",
      "Type the Notes (required — e.g. the reason) and tap Start Bed Rest.",
      "When it's over tap End Bed Rest.",
    ],
  },
  {
    id: "start-homecare",
    title: "Send a dog out on jail break or foster",
    topic: "Out of the kennel",
    audience: "staff",
    keywords: "carer take home overnight weekend start homecare approved",
    steps: [
      "On an Available dog tap ⋯ then Start Jail Break or Start Foster.",
      "Choose the carer. Only people with an approved role for that program appear — if someone is missing they haven't been approved yet.",
      "Set Due End (date and time, or the days dropdown), add Notes if useful, and Start.",
      "When the dog is back tap End Jail Break / End Foster.",
    ],
  },
  // ---------------- People
  {
    id: "people-list",
    title: "Find people and filter the list",
    topic: "People",
    audience: "staff",
    keywords: "search filter roles volunteer committee staff carers pending last walk",
    steps: [
      "Open the People tab. Type a name in the search box.",
      "Tap the chips (Volunteers, Volunteer +, Jail break, Foster, Committee, Staff, Pending) to filter. You can pick more than one — it shows people who match any of them.",
      "Volunteers show their last walk and 4-week walking time on the list.",
    ],
  },
  {
    id: "approvals",
    title: "Approve a jail break, foster or under-18 application",
    topic: "People",
    audience: "staff",
    keywords: "pending approve decline waiting awaiting home check yard check",
    intro: "Only Paul, Julie and Shayna can approve or decline.",
    steps: [
      "On People, open the Awaiting approval roll-down at the top, or open the person's page.",
      "Jail break: review the details, then Approve (or use the button in the notification email).",
      "Foster: record a home check first (Record home check). Once it passes, Approve becomes available.",
      "Under-18 volunteer: check the parent's consent, then Approve.",
    ],
  },
  {
    id: "add-homecare-role",
    title: "Add jail break or foster to an existing volunteer",
    topic: "People",
    audience: "staff",
    keywords: "update status existing carer apply homecare form",
    steps: [
      "Open the person's page and tap Update status.",
      "Choose Add jail break carer… or Add foster carer….",
      "The form is pre-filled with any home details we already hold — check them, add anything missing, tick agreement, and have them type their name.",
      "Submit. They show as pending until approved.",
    ],
  },
  {
    id: "volunteer-plus",
    title: "Make someone a Volunteer + or committee member",
    topic: "People",
    audience: "admin",
    keywords: "kiosk access trusted account upgrade promote",
    steps: [
      "Open the person's page (they need an email address on file) and tap Update status.",
      "Choose Make Volunteer + (can run walk and yard check-in/out for others) or Make committee member (sees everything staff see).",
      "Tell them to sign in with the email code using that email address.",
    ],
  },
  {
    id: "staff-in-people",
    title: "Where are staff managed?",
    topic: "People",
    audience: "staff",
    keywords: "caretaker add staff roster shift delete merge archive",
    steps: [
      "Caretakers appear in the People list for reference, but they are added, edited and removed in the Staff app (Roster → Staff).",
      "To protect shift history, Delete, Merge and Archive are turned off for staff in People.",
    ],
  },
  // ---------------- Records & reports
  {
    id: "logs-search",
    title: "Search the logs (e.g. when did Paul walk?)",
    topic: "Records & reports",
    audience: "staff",
    keywords: "history find when walked person dog filter search notes csv download export",
    steps: [
      "Open Logs. All activity shows every walk, yard, bed rest, jail break and foster.",
      "Type a name in Person (and/or a dog in Dog) and pick it from the list. Choose a date range or a quick date like Last 7 days.",
      "Use the type chips to narrow to just Walks, or Status and Flags to see what's still out or was logged late.",
      "Search notes finds words in the Notes column. The line above the table shows the total records and time.",
      "Download CSV saves what's on screen.",
    ],
  },
  {
    id: "qr-codes",
    title: "Print the QR codes for the forms",
    topic: "Records & reports",
    audience: "staff",
    keywords: "poster sign scan volunteer foster form print",
    steps: [
      "On the Site Visitors tab tap Printable QR codes for the forms.",
      "Tap Print. Put the volunteer code and the foster / jail break code up around the site.",
    ],
  },
  // ---------------- Modes & access
  {
    id: "modes",
    title: "Staff Mode and Volunteer Mode",
    topic: "Modes & access",
    audience: "staff",
    keywords: "pin switch hand over shared device ipad kiosk cafe locked",
    steps: [
      "On a shared device a staff member taps Switch to Volunteer Mode. The app shows only what volunteers need: walks, yard, visitors and basic dog info.",
      "To go back, tap Switch to Staff Mode and enter the staff PIN. It also switches back to volunteer mode on its own after a while with no use.",
      "Admins set or change the PIN under the ⚙ settings.",
    ],
  },
  {
    id: "staff-app",
    title: "Going to the Staff app",
    topic: "Modes & access",
    audience: "staff",
    keywords: "shift roster checklist handover caretaker julie",
    steps: [
      "Staff and admins see a blue Staff app → button at the top right. Tap it for shift sign-in, the checklist, the roster and handover notes.",
      "In the Staff app, the Dog app → button brings you back here.",
    ],
  },
];

export function canSee(a: HelpArticle, viewer: { isStaff: boolean; canKiosk: boolean; isAdmin: boolean }): boolean {
  if (a.audience === "everyone") return true;
  if (a.audience === "kiosk") return viewer.canKiosk;
  if (a.audience === "staff") return viewer.isStaff;
  return viewer.isAdmin;
}

const WORD = /[a-z0-9+]+/g;

/** Words from `s`, lower-cased. */
function words(s: string): string[] {
  return s.toLowerCase().match(WORD) ?? [];
}

function wordMatches(w: string, token: string): boolean {
  if (w === token) return true;
  // Light stemming: "walking" finds "walk", "walks" finds "walking".
  const a = token.length >= 4 ? token.slice(0, 4) : null;
  return a !== null && w.length >= 4 && w.startsWith(a) && (w.startsWith(token.slice(0, Math.min(token.length, 5))) || token.startsWith(w.slice(0, 4)));
}

/** Rank articles for a question. Every word typed has to turn up somewhere in
 *  the article (title, keywords or steps); title hits count most. */
export function searchArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  const tokens = words(query).filter((t) => t.length > 1 && !["the", "how", "do", "to", "can", "i", "a", "an", "my", "is", "of", "for", "on", "in", "and"].includes(t));
  if (tokens.length === 0) return articles;

  const scored = articles
    .map((a) => {
      const title = words(a.title);
      const kw = words(a.keywords);
      const body = words([a.intro ?? "", ...a.steps].join(" "));
      let score = 0;
      for (const t of tokens) {
        const inTitle = title.some((w) => wordMatches(w, t));
        const inKw = kw.some((w) => wordMatches(w, t));
        const inBody = body.some((w) => wordMatches(w, t));
        if (!inTitle && !inKw && !inBody) return { a, score: 0 };
        score += (inTitle ? 5 : 0) + (inKw ? 3 : 0) + (inBody ? 1 : 0);
      }
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
  return scored.map((x) => x.a);
}
