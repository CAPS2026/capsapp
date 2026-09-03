# CAPS rebuild plan

**Status:** current AppSheet app **frozen** as of 3 Sep 2026 — keep using it until cutover, no new features on it.
**Goal:** a bombproof replacement — own database, own forms, code we can read and change.
**This doc:** the stack (settled), the decisions still needing you, the order of work, and the cutover.

---

## 1. Stack (settled)

| Layer | Choice | Role |
|---|---|---|
| Database | **Supabase** (Postgres) | source of truth. Real keys, constraints, transactions, backups. |
| Auth | **Supabase Auth** | sign-in + roles. Replaces AppSheet's Google-sign-in + allowlist. |
| App + API | **Vercel** | serves the web app (a PWA) and runs the serverless functions. Auto-deploys from GitHub on every push. |
| Code | **GitHub** | stores the code + history. |
| Public forms | **Own HTML pages** in the app | `/apply/volunteer`, `/apply/homecare`. No Google Forms, no Apps Script. |
| Email | **Resend** (transactional API) | the "email the applicant / notify staff" steps. |
| Files (if kept) | **Supabase Storage** or keep Google Drive | dog photos, application PDFs. |

**Make.com is removed.** Its job (receive form → make folder/doc → write row → email → approval flow) becomes ~1–2 serverless functions in the same repo. Less fragile because it's testable code, no visual blueprint, no bundle-fail-siblings, real retries and logging. **Three vendors (Google Form + Apps Script + Make) → zero.**

---

## 2. Order of work — answering "structure first or interface first?"

**Structure first, but with a short features/flows step in front of it, and theme is a small late step — not a phase.**

```
Phase 0  Features & workflows  — WHAT it does. Short. (mostly done; you add/cut the new bits)
Phase 1  Schema (Supabase)     — the data model, designed against Phase 0's workflows
Phase 2  Flow design           — for each workflow: screens, taps, prefill, confirm. Text/wireframe, not pixels.
                                 This is where "is the checkout the best version?" gets answered.
Phase 3  Component kit + theme  — pick a UI library, one accent colour, big touch targets. A few hours.
Phase 4  Build in vertical slices — schema→API→screen for ONE workflow, test on the real tablet, then next.
                                 Start with the highest-frequency flow (walk check-out/in).
Phase 5  Migrate + parallel run + cutover
```

Why this order:
- The **schema** is the foundation everything hangs off — get it right once. But you design it knowing the workflows it must serve (that's why Phase 0 comes first, briefly).
- **Flows before pixels.** The current check-out has real weaknesses (picks dogs by *name* — and you have two "Cookie"s; parses display strings; bounces through a redirect). The rebuild is the moment to design **one canonical check-out/check-in pattern** — *pick → confirm → done* — and reuse its exact shape for walk, homecare, bed rest. That consistency is a design decision, made in Phase 2, not something you inherit from AppSheet.
- **Theme is light.** A shelter tablet app needs to be clear, fast, big-buttoned, sunlight-readable. It does not need a bespoke design system. One component library + one colour.
- **Vertical slices** beat "all backend then all frontend" — you get a working, tablet-tested walk check-in early, which de-risks everything and gives the team something real to react to.

---

## 3. Phase 0 — features & workflows (draft; mark it up)

### Carry over from the current app
Dogs list by status · walk check-out / check-in · homecare check-out / return (jail break + foster) · bed rest start / end · dog exit / archive · add a dog · volunteer register + exit · homecarer register + approve/decline · site visit sign-in / sign-out · the "days since last walk" / "minutes this month" stats.

### New (you named these)
- **Dog profiles** — a real page per dog (photo, level, arrival, status, current carer, history).
- **Medical history** — a *log* of medical events per dog, not one notes field.
- **User notes** — notes on a volunteer/homecarer, and notes on a dog, timestamped + attributed.
- **Overdue alerts** — dog not signed back in by its due date/time → email to staff.
- **Data analysis** — walk frequency, length-of-stay, carer load, dogs not walked in N days, intake/exit trends.

### Decisions for you (Phase 0)
- **Dog photos in v1?** (yes / later)
- **Bed rest → events table** (a log, like homecare) — agree?
- Anything above that's **out of scope for v1**?
- Anything the current app does that we should **drop**?

---

## 4. Decisions — all resolved 03/09/2026 (D2–D10 accepted as recommended)

| # | Decision | Resolution |
|---|---|---|
| D1 | **Offline** | ✅ Not needed — tablet on Starlink is the check-in method. Optimistic writes + retry. |
| D2 | **Auth method** | ✅ Email **magic link** (no passwords) + Google sign-in option. Every **volunteer gets a login** (they log walks on their own phones — P7); registration creates the account. Shelter tablet also runs as a shared **kiosk** (pick-your-name). |
| D3 | **Roles** | ✅ `admin` (Paul, Shayna) · `staff` · `volunteer` (log own walks, view dogs) · `read-only`. Public forms unauthenticated. Adopters (v1.1) get magic-link view-only access to their own application. |
| D4 | **Keep existing IDs** | ✅ Keep `D001` / `V001` / `HC…` / `HCR…`. New records: human-readable + collision-proof. |
| D5 | **Applications storage** | ✅ In-app structured record + PDF on demand. No Drive dependency. |
| D6 | **Reporting mirror** | ✅ Yes — nightly read-only Supabase→Google Sheet. |
| D7 | **Alert channel** | ✅ Email (Resend) for v1. SMS later if needed. |
| D8 | **Domain** | ✅ `caps-app.vercel.app` for v1; real domain later. |
| D9 | **Maintenance** | ✅ Keep it simple + a written runbook. Paid dev help TBD. |
| D10 | **Staging** | ✅ Separate Supabase project + Vercel preview. Never test on live data. |

---

## 5. What I need from you to start

1. Answers to **D1–D10** above (D1 is the blocker — check with the caretakers).
2. **Authorise the Vercel connector** in claude.ai connector settings.
3. A **Supabase project** — I can create one via tooling once you say go, or you create it and share the keys.
4. A **GitHub repo** (empty is fine) — or I scaffold one.
5. Mark up **Phase 0** (§3) — add/cut features.

---

## 6. Cutover

1. New app live alongside AppSheet. Public forms point at the new app.
2. Nightly script reconciles: anything entered in AppSheet during the overlap gets pulled into Supabase.
3. ~2 weeks parallel. Volunteers use the new app for real; AppSheet stays as the safety net.
4. Flip: AppSheet set read-only, new app is the system of record.
5. Keep AppSheet read-only for a month, then archive.

---

## 7. Rough effort — D1 resolved (no offline needed)

| Phase | Working sessions |
|---|---|
| 0 features/flows | 1 (mostly conversation) |
| 1 schema | 1–2 |
| 2 flow design | 2–3 |
| 3 theme/kit | part of 1 |
| 4 build — ~10 workflows, vertical slices, tablet-tested | 8–15 |
| 5 migrate + parallel + cutover | 2–4, spread over ~2 weeks calendar |

**Ballpark: ~15–25 working sessions over 4–8 weeks calendar.** Faster with long sessions and quick decisions; slower if we iterate hard on UI or hit migration surprises. A multi-week build needs sustained Claude Code access — worth confirming the licence covers the run.

**Model:** Sonnet is the right workhorse for the build — this is well-specified CRUD, not a research problem. Switch to Opus for the thinking-heavy checkpoints: schema review, Phase 2 flow design, tricky migration logic, stubborn bugs. `/model` switches mid-project.
