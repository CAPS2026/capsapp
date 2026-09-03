# Homecarers backfill — reconciliation output

**Date:** 2 September 2026
**Sources:** CAPS Foster Carers & Jail Break Program Register (the docx you attached — treated as definitive) · Homecare form submissions · Volunteers MASTER · open Homecare events in the app.

---

## 1. What was written

Built as a **merge on top of the live `Homecarers` tab** (read 2 Sep 2026), not a rebuild — so `start_date`, `applied_date`, `property_ownership`, `signature_name/date`, `jb_*` and all household columns your v1 backfill filled are retained untouched.

- **`homecarers_merged.tsv`** — the full `Homecarers` tab after reconciliation: 18 existing rows (in their current order, corrections layered on) + 16 new rows = 34 people + header.
- **`homecarers_new_rows_only.tsv`** — just the 16 new rows (HCR045 + HCR500–HCR514), no header, ready to paste below HCR000.
- **16 new Drive folders** created in `03 Homecare / 01 Homecare Applications` (`11mOWmOIdhvyKV42giWfQjTID_xEj8Jyj`), folder IDs already in the `folder_id` column of the new rows.
- **Not touched:** the live rows' dates, signatures, household answers, and AA Yard's `caretaker@` email / dates.

### Row inventory

| Band | IDs | Who |
|---|---|---|
| Utility | HCR000 | AA Yard (Wayne's "chuck it in the yard" jail break) |
| Staff | HCR001, HCR002 | Shayna, Wayne |
| Existing, register-matched | HCR007, 039, 040, 041, 045, 048, 050, 051, 052, 053, 054, 055, 056 | 13 carers already in the tab — corrected against the register |
| Existing, **not** in register | HCR042, 043, 057 | Mikaela Branch, Trudi L, Emily Bloomfield — from Volunteers MASTER only. **Confirm keep.** |
| New from register | HCR500–HCR514 | 15 carers with no prior HCR row |

HCR045 (Sam Aschenbrenner & Nigel Tait) mirrors their existing volunteer number V045; the 15 brand-new carers got HCR500+ so they never collide with the volunteer-numbered band.

---

## 2. Corrections applied to the 13 existing rows

Household data (fence, people, animals, experience) kept from each person's homecare form. Name / phone / email / address overwritten from the register where the register had better data.

| ID | Field | Was | Now (register) |
|---|---|---|---|
| HCR001 Shayna | address | *(blank)* | 1/16 Christie Ave, Nanum |
| HCR001 Shayna | email | *(form value)* | shayna-marie@hotmail.com |
| HCR039 Vanessa | surname spelling | "Moore" ok; first name was "Vannessa" | Vanessa Moore |
| HCR039 | email / phone | placeholder | pvmoore_779@bigpond.com / 0407 205 282 |
| HCR040 Helen | surname | "Ryan / Philpot" | Philpot (alias noted in `notes`) |
| HCR040 | email / phone | placeholder | ninjakitteh4683@gmail.com / 0410 762 102 |
| HCR007 Kim | email / phone | placeholder | kim.jolly@health.qld.gov.au / 0499 382 293 |
| HCR041 Sonya | email / phone | placeholder | fletchers.24@outlook.com / 0400 240 297 |
| HCR048 Lauren Nash | email | info@… (the bad s.lnash@live.com was pulled earlier) | **s.lnash@live.com.au** — register spells it with `.au`; use this |
| HCR048 | phone | short/NIL | 0405 641 716 |
| HCR050 Kate | surname | "Leigh" | **Lee** |
| HCR050 | contact | *(none)* | no phone/email on file — register says **Facebook Messenger only** |
| HCR051 Rose-Beth | surname | "Orman" | **Orman** kept — register typo'd it "Ornman", Paul confirmed Orman is correct |
| HCR051 | phone | NIL | 0401 786 737 |
| HCR052 Leah | phone | NIL | 0435 576 726 / 0476 300 376 (partner Stuart Brooks) |
| HCR053 Adam | contact | *(none)* | no phone/email — register says **Facebook Messenger only** |
| HCR054 Madison | email / phone | placeholder | madison.granzien.07@hotmail.com / 0488 171 684 |
| HCR055 Ashleigh-Mae | address | "Silmax Way" | **Smilax Way** (2/13) |
| HCR055 | email / phone | placeholder | amae_98@hotmail.com / 0434 246 920 |
| HCR056 Taylor | email / phone | placeholder | tailssvip@gmail.com / 0499 055 447 |

All 13 set to `status=Active`, `jailbreak_approved=J`, `foster_approved=F`, `over_18=Yes` (they are all on the definitive foster+jailbreak register).

---

## 3. Dogs logged against Shayna (V001) that the register says are with someone else

This is the mess you predicted. The Homecare events tab has a **bulk entry dated 25 Aug 2026 21:00 (HC78–HC90)** that put ~13 dogs on `V001 / Shayna` in one go. The register attributes most of them to other carers:

| Homecare row | Dog | App says (open stint) | Register says current foster | Action |
|---|---|---|---|---|
| HC78 | **Frankie** | V001 Shayna | **Richelle Ryan** (HCR508) — "Foster to Adopt" | repoint |
| HC81 | **Jones** | V001 Shayna | **Rose-Beth Orman** (HCR051) | repoint |
| HC82 | **Willow** | V001 Shayna | **Madison Granzien** (HCR054) | repoint |
| HC83 | **Kodak** | V001 Shayna | **Adam Kustron** (HCR053) | repoint |
| HC87 | **Shadow** | V001 Shayna | **Kim Jolly** (HCR007) | repoint |
| HC89 | **Geko** | V001 Shayna | **Leah Derby** (HCR052) | repoint |
| HC80 | **Cookie (Female)** | V001 Shayna | **Aimee Redding** (HCR507) — "Foster to Adopt" | repoint — but see note |
| HC100 | **Cookie** | V002 Wayne | **Aimee Redding** (HCR507) | there are two "Cookie" stints open — decide which dog is Aimee's |
| HC38ffe612 | **Milo** | HCR000 AA Yard *(your test checkout)* | **Lisa Jane** (HCR506) | repoint once real |

### Dogs on that Shayna bulk entry that are NOT in the register at all
HC79 **Drifter**, HC84 **Hoagie**, HC85 **Lulu**, HC88 **Jesse**, HC90 **Rue**, and HC86 (**blank dog name** — malformed row). Either these came back before the register was written, or they belong to carers not on the list. Worth a quick check with Shayna whether any are genuinely still with her.

### Register dogs with NO matching open Homecare stint
| Dog | Register carer | Note |
|---|---|---|
| **Maeve** | Tahlia Kos / Morgan Grey (HCR500 / HCR501, same address) | no homecare event logged |
| **Callie** | Lauren Nash (HCR048) | no homecare event logged |
| **Chewy** | Vanessa Moore (HCR039) | Dogs tab shows "Fostered" but no Homecare event row |
| **Astra** | Ashleigh-Mae Bullen (HCR055) | app currently has Astra on **Bed Rest**, not homecare — conflict |

### Stints that look fine
HC55 Sammi, HC56 Nibbles → Shayna ✓ · HC58/59/60 Liv/Frida/Bonnie → Helen Philpot ✓ · HC77 Coco → Kate Lee ✓ (but the due-back date 25/08/2026 has passed — overdue flag).

---

## 4. Flags for you to resolve

1. **HCR042 Mikaela Branch, HCR043 Trudi L, HCR057 Emily Bloomfield** — carried from Volunteers MASTER, not on the definitive register. **Paul confirmed 02/09/2026: keep all three as homecarers.** Trudi's surname is still just "L" — needs filling in.
2. **Kate Lee (HCR050) and Adam Kustron (HCR053)** — no phone or email anywhere; register says contact via Facebook Messenger only. Left blank in email/phone.
3. **Couples / same-address pairs** — recorded under one HCR each: Tahlia Kos + Morgan Grey (both HCR500/501, same unit — possibly one household), Maddie & Nathan Jackson (HCR503), Jaiden Perez & Rose Tickner (HCR505), Sam Aschenbrenner & Nigel Tait (HCR045), Leah Derby & Stuart Brooks (HCR052).
4. **Lisa Jane (HCR506)** and **Ashlee Polmear (HCR502)** — no email in the register.
5. **The 25 Aug bulk Homecare entry** needs cleaning in the `Homecare` events tab (§3). I have not touched event rows — that's live checkout data and your call how to fix (repoint `homecarer_id` on each, or end + re-open).
