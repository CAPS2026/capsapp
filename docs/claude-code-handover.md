# Handover to Claude Code — Push the Volunteer Registration Change

**Written:** 30 August 2026, end of a long Claude.ai session that fully investigated and designed this change but could not push it (external write tools — Make AND Google Drive — failed with "No approval received" in that interface; looks like a session-level issue, not something specific to Make).

**Read `CAPS System Overview.md` (or `system-overview.md`) and the other section docs in this same folder first** for full system context — Volunteers/Homecare/Walks/Dogs/Site Visits, the two Google Forms, the Apps Scripts, all verified against real data. This document only covers the one pending task.

---

## The task

Push one already-designed, already-reviewed-line-by-line change to the live Make scenario. Paul has seen and approved this exact diff. Your job: verify it against the live scenario (things may have changed since this was written), get a final quick confirmation from Paul, then push it.

**Scenario:** "Integration Webhooks", `scenarioId 6322986`, `teamId 2010758`, `organizationId 8153520`.

## What the change does

Removes the manual staff approval step from Volunteer Registration. Today: application comes in → folder + doc created → staff emailed to approve/decline → only on approval does a Volunteers row get created. After this change: application comes in → folder + doc created (unchanged) → Volunteers row created immediately, no approval needed → staff gets an FYI email (not a decision request) → applicant gets a welcome email.

**Untouched, must stay untouched:** everything about Homecare — its own approval buttons, its own logic, entirely separate branch of this scenario.

## Exact procedure

1. **Fetch the current live blueprint fresh** (`scenarios_get`, scenarioId 6322986). Do not assume it still matches what's described below — verify.
2. **Locate the path:** `flow[1]` (top router) → `routes[0].flow[0]` (router id 30, the "Application" branch) → `routes[0].flow` — this should currently be a 3-element array: modules with `id: 7`, `id: 3`, `id: 8` in that order (createAFolder, createADocumentFromTemplate, sendAnEmail). **If this isn't what you find, stop and tell Paul what's different before proceeding** — the plan below assumes this exact starting state.
3. **Replace that 3-element array with a 7-element array**, in this order:
   - `id: 7` — unchanged, copy as-is from the live blueprint.
   - `id: 3` — unchanged, copy as-is from the live blueprint.
   - `id: 8` — **replaced** with the exact JSON in `mod8_new.json` below (module 8, edited: approve/decline buttons removed, intro sentence corrected, Interests section added, subject line changed).
   - `id: 201, 202, 203, 204` — **new**, exact JSON in `new_modules_201_204.json` below. In order: filterRows (find latest Volunteer_ID) → SetVariable2 (compute next ID) → addRow (insert the new Volunteers row) → sendAnEmail (welcome message to the applicant).
4. **Nothing else in the blueprint changes.** The old approval branch (modules 4, 16, 11, 12, 9, 17, 14 — the "Volunteer Assessment" branch) is left completely in place, untouched. It will simply stop being reachable, since nothing will generate its trigger URL anymore. Do not delete it.
5. **Show Paul the actual diff** (or a tight summary of it, referencing the module IDs above) and get an explicit go-ahead before calling `scenarios_update`. He's already reviewed this design in detail — this confirmation is about "does the live scenario still match what we expected," not re-litigating the design itself.
6. **Push** via `scenarios_update`, `confirmed: true` if prompted about existing apps (all apps used here — google-drive, google-docs, google-sheets, google-email, util — are already in use elsewhere in this same scenario, nothing new).
7. **Verify** by fetching the scenario again post-push and confirming the flow matches what was intended.

## Testing, once pushed

Agree with Paul on safe test values first (a test name/email he controls) before triggering a real submission — this scenario has real side effects (creates a real Drive folder, sends real emails, writes a real row to the live Volunteers sheet). Don't invent test data unilaterally.

## After it's confirmed working

Update `volunteer-registration-current-state.md` and `system-overview.md` in this same folder to reflect the new live state — remove the "not yet pushed" language, describe the new flow as current, move the old approval-branch description into a "superseded" note rather than presenting it as active. This was explicitly promised to Paul; don't skip it.

---

## `mod8_new.json` — the edited module 8

```json
{
  "id": 8,
  "mapper": {
    "to": ["info@capeanimalprotectionshelter.org.au"],
    "from": "\"CAPS info\" <info@capeanimalprotectionshelter.org.au>",
    "content": "\r\n<h2>New Volunteer Application</h2>\r\n<p>A new volunteer has just been registered automatically. Their details and interests are below.</p>\r\n<h3>Applicant Details</h3>\r\n<p>\r\n<strong>Name:</strong> {{1.firstname}} {{1.surname}}<br>\r\n<strong>Email:</strong> {{1.email}}<br>\r\n<strong>Phone:</strong> {{1.phone}}\r\n</p>\r\n<p><strong>Full application:</strong> <a href=\"{{3.webViewLink}}\">View Google Doc</a></p>\r\n<h3>Interests</h3>\r\n<ul>\r\n{{if(1.committee != \"\"; \"<li>Committee Member</li>\"; \"\")}}\r\n{{if(1.fundraising != \"\"; \"<li>Fundraising / Community Events</li>\"; \"\")}}\r\n{{if(1.walking != \"\"; \"<li>Dog Walking</li>\"; \"\")}}\r\n{{if(1.feeding != \"\"; \"<li>Shelter feeding and cleaning</li>\"; \"\")}}\r\n{{if(1.transport != \"\"; \"<li>Pet transport</li>\"; \"\")}}\r\n{{if(1.pet_minding != \"\"; \"<li>Pet minding</li>\"; \"\")}}\r\n{{if(1.cooking != \"\"; \"<li>Cooking / Food preparation</li>\"; \"\")}}\r\n{{if(1.social_media != \"\"; \"<li>Social media</li>\"; \"\")}}\r\n{{if(1.where_useful != \"\"; \"<li>Wherever most useful</li>\"; \"\")}}\r\n{{if(1.foster_or_jailbreak != \"\"; \"<li>Foster Care / Jail Break (separate form required)</li>\"; \"\")}}\r\n</ul>\r\n<p><em>This is an automated message from the CAPS volunteer registration system.</em></p>\r\n",
    "subject": "New Volunteer: {{1.firstname}} {{1.surname}}",
    "bodyType": "rawHtml"
  },
  "module": "google-email:sendAnEmail",
  "version": 4,
  "metadata": { "advanced": true, "designer": {"x": 1493, "y": -275},
    "parameters": [{"name": "__IMTCONN__", "type": "account:google-email", "label": "Connection", "required": true}]
  },
  "parameters": {"__IMTCONN__": 8774783}
}
```
*(Full metadata with `expect`/`restore` blocks preserved from the original module 8 — copy those verbatim from the live blueprint's existing module 8 rather than retyping; only `mapper.content` and `mapper.subject` actually changed.)*

## `new_modules_201_204.json` — the four new modules

```json
[
  {
    "id": 201,
    "filter": null,
    "mapper": {
      "from": "share", "limit": "1",
      "filter": [[{"a": "A", "b": "V", "o": "text:contain"}]],
      "orderBy": "__ROW_NUMBER__", "sheetId": "Volunteers", "fieldType": "string",
      "sortOrder": "desc", "spreadsheetId": "1fHX7ciYDXNnzyM3aPHTsGrOh6rYM6FZPaea4h45740M",
      "tableFirstRow": "A1:Z1", "includesHeaders": true,
      "valueRenderOption": "FORMATTED_VALUE", "dateTimeRenderOption": "FORMATTED_STRING"
    },
    "module": "google-sheets:filterRows", "version": 2,
    "metadata": {"designer": {"x": 1630, "y": 196}},
    "parameters": {"__IMTCONN__": 8643169}
  },
  {
    "id": 202,
    "filter": null,
    "mapper": {
      "name": "New_Volunteer_ID", "scope": "roundtrip",
      "value": "V{{substring(toString(sum(parseNumber(replace(201.`0`; \"\"\"V\"\"\"; \"\")); 1; 1000)); 1)}}"
    },
    "module": "util:SetVariable2", "version": 1,
    "metadata": {"designer": {"x": 2005, "y": 191}},
    "parameters": {}
  },
  {
    "id": 203,
    "mapper": {
      "from": "team", "mode": "select",
      "values": {
        "0": "{{202.New_Volunteer_ID}}", "1": "{{1.vol_name}}", "2": "{{1.firstname}}",
        "3": "{{1.surname}}", "4": "{{formatDate(now; \"DD/MM/YYYY\"; \"Australia/Brisbane\")}}",
        "6": "Active", "10": "{{1.experience}}", "11": "{{1.ec_name}}", "12": "{{1.ec_phone}}",
        "13": "{{1.ec_email}}", "14": "{{1.ec_relationship}}", "15": "{{1.medical_issues}}",
        "16": "{{1.under_18}}", "19": "{{1.email}}"
      },
      "sheetId": "Volunteers", "sharedDrive": "0ADIdPcaRe6vWUk9PVA",
      "spreadsheetId": "/1OKja_o46GWEMYwsYoSeyclZo0Ix59rBM/1fHX7ciYDXNnzyM3aPHTsGrOh6rYM6FZPaea4h45740M",
      "includesHeaders": true, "insertDataOption": "INSERT_ROWS", "useColumnHeaders": false,
      "valueInputOption": "USER_ENTERED", "insertUnformatted": false, "useDomainAdminAccess": false
    },
    "module": "google-sheets:addRow", "version": 2,
    "metadata": {"designer": {"x": 2309, "y": 198}},
    "parameters": {"__IMTCONN__": 8643169}
  },
  {
    "id": 204,
    "mapper": {
      "to": ["{{1.email}}"],
      "from": "\"CAPS info\" <info@capeanimalprotectionshelter.org.au>",
      "content": "<h2>Welcome to CAPS!</h2>\r\n\r\n<p>Dear {{1.firstname}},</p>\r\n\r\n<p>We are delighted to welcome you to the Cape Animal Protection Shelter Inc. (CAPS) volunteer team!</p>\r\n\r\n<p>Your application has been reviewed and approved. You are now a registered CAPS volunteer.</p>\r\n\r\n<p>We will be in touch shortly with more information about the next steps on how you can get started with your volunteer activities.</p>\r\n\r\n<p>If you have any questions in the meantime, please don't hesitate to contact us at \r\n<a href=\"mailto:info@capeanimalprotectionshelter.org.au\">info@capeanimalprotectionshelter.org.au</a></p>\r\n\r\n<p>Thank you for giving your time to help the animals in our care.</p>\r\n\r\n<p>Warm regards,<br>\r\nThe CAPS Team<br>\r\nCape Animal Protection Shelter Inc.<br>\r\nWeipa, Queensland</p>",
      "subject": "Welcome to the CAPS Team !!",
      "bodyType": "rawHtml"
    },
    "module": "google-email:sendAnEmail", "version": 4,
    "metadata": {"designer": {"x": 2593, "y": 199}},
    "parameters": {"__IMTCONN__": 8774783}
  }
]
```

Note: the `mapper` content above is complete and correct for all four. Full `metadata.expect`/`restore` blocks (the UI-restoration detail Make stores) were trimmed here for readability — safest approach is to fetch the live blueprint, copy modules 11, 12, 9, and 17 wholesale as templates (they have the full metadata), then apply only the `id` change and the `mapper` differences shown above, rather than constructing 201-204 from this trimmed JSON directly.
