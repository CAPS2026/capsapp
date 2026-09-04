# CAPS App — visual design (Phase 3)

Light, warm, hand-drawn feel — taken from the CAPS logo. Not corporate, not clinical.
Must stay legible on a shelter tablet in daylight and on a phone outdoors.

Stack: **Next.js (App Router) + Tailwind CSS + shadcn/ui**. shadcn themes through CSS
variables, so the tokens below drop straight in.

---

## 1. Colour tokens

From the logo: cornflower blue (ring text + "C.A.P.S"), coral/peach watercolour,
sunny yellow (the cap), tan dog, cream paper.

```css
:root {
  /* brand */
  --brand:        #2C7BD4;  /* cornflower blue — primary actions, links, active nav, "Walking" */
  --brand-ink:    #1F5DA8;  /* darker blue — hover, text on tint */
  --brand-tint:   #EAF2FC;  /* pale blue surface */

  /* warm accent (watercolour) */
  --warm:         #F2955C;  /* coral/peach — secondary accent, timers going long, "Jail Break" */
  --warm-ink:     #D9703B;
  --warm-tint:    #FDEEE3;

  /* highlight (the cap) — use sparingly */
  --sun:          #F6C445;  /* yellow — "Yard", small highlights, the energy accent */
  --sun-tint:     #FEF6DE;

  /* surfaces & ink */
  --paper:        #FDF8F2;  /* page background — warm cream */
  --card:         #FFFFFF;
  --ink:          #172A44;  /* body text — dark blue-charcoal */
  --ink-muted:    #5A6B82;  /* secondary text */
  --line:         #E7DECF;  /* borders on cream */
  --line-cool:    #D9E2EE;  /* borders on white/blue */

  /* semantic (not in the logo, needed) */
  --ok:           #3F9D6B;  /* green — "Available", success */
  --danger:       #D64545;  /* red — overdue, destructive, validation errors */

  --radius:       0.75rem;  /* rounded, friendly */
}
```

### Dog-status colours (home-base group headers & pills)
Muted tints for group headers; the solid colour only on the small status pill.

| Status | Colour | Token |
|---|---|---|
| Walking | blue | `--brand` |
| Yard | yellow | `--sun` |
| Available | green | `--ok` |
| Bed Rest | slate | `#6B7A99` (`--slate`) |
| Jail Break | coral | `--warm` |
| Fostered | rose | `#D98BA8` (`--rose`) |
| Exited (archive only) | grey | `--ink-muted` |

### Timer states (walk / yard elapsed)
`--ink-muted` → **`--warm`** past the alert threshold → **`--danger`** at ~2× threshold.

### Dark mode
**Light-only for v1.** It's a daytime tablet-and-phone tool; a dark theme is scope
we don't need yet. Tokens are defined on `:root` only; revisit later.

---

## 2. Typography

- **UI / body:** system stack — `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Fast, native, no webfont weight.
- **Display (screen titles, the wordmark):** a rounded friendly face — **Nunito** (Google Fonts, weights 700/800) — echoes the logo's lettering. One webfont, headings only.
- Scale: 12 / 14 / 16 (base) / 20 / 24 / 30. Line-height 1.5 body, 1.25 headings.
- Numbers in timers/counters: `font-variant-numeric: tabular-nums`.

---

## 3. Layout, spacing, touch

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- **Minimum tap target 44×44 px.** Primary actions (Take out / Bring in / Confirm) are full-width or ≥ 56 px tall.
- Cards: `--card` on `--paper`, 1px `--line`, `--radius`, generous padding (16).
- One primary action per screen, bottom-anchored on phones (thumb reach).
- Content max-width ~640 px on tablet; single column throughout.
- Bottom nav: 5 items max, icon + short label, active item in `--brand`.

---

## 4. Logo — careful placement

The badge is detailed; it only reads at **≥ 40 px**. Below that, use the **wordmark**
("CAPS" in Nunito 800, `--brand`) or a simplified mark, never the shrunken badge.

**Asset needed in the repo:** `public/logo.png` (the full badge, transparent bg) and
ideally `public/logo-mark.svg` (a simplified single-colour dog head or the "C.A.P.S"
wordmark) + `public/icon-512.png` / `icon-192.png` (PWA, the full badge on cream).

| Where | Treatment |
|---|---|
| PWA / home-screen icon | full badge, centred on `--paper` |
| Login screen | full badge, ~120 px, centred, above the sign-in card |
| Kiosk idle / "who are you?" screen | full badge, large |
| Top bar | small mark (~28 px) far left + the screen title; **not** the full badge |
| Empty states ("no dogs out right now") | faded mark at ~10% opacity, ~80 px |
| Print exports (SavourLife poster, PDFs, welcome email) | full badge in the header |
| Anywhere else | nothing — no watermark behind content, no repeat on cards |

---

## 5. Components (shadcn/ui, themed)

Use as-is, restyled by the tokens: `button`, `card`, `dialog` (confirm steps),
`sheet` (pickers on mobile), `input`, `select`, `command` (dog/person search),
`badge` (status pills, late/edited flags), `tabs` (logs), `sonner` (toasts),
`avatar` (dog photo), `calendar` + time input (due-back, retro times).

Conventions:
- **Primary button** = `--brand` fill, white text. **Confirm** buttons say what happens ("Confirm — Rex is now Walking").
- **Warm/secondary** = `--warm` outline or fill for the retrospective / "this already happened" path, so it reads as the non-default route.
- **Destructive** = `--danger`, always behind a confirm.
- Status pill = solid status colour, white text, small, rounded-full.
- Late/edited badge = `--sun-tint` bg, `--warm-ink` text, tiny.
- Validation errors inline under the field in `--danger`; guardrail blocks (return-before-start) as a `dialog`, not a silent disable.

---

## 6. Accessibility / outdoors

- Body text ≥ 16 px, contrast ≥ 4.5:1 (`--ink` on `--paper` ≈ 12:1; `--brand` on white ≈ 4.6:1 — OK for text, prefer `--brand-ink` for small text on white).
- Don't rely on status colour alone — always pair with the label.
- Focus ring visible (`--brand`, 2px offset).
- Timers and counts use tabular figures so they don't jitter.
