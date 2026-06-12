# 09 — Live integrations: what exists, what we must apply to

Decision (2026-06-12, Oria): we want **live integrations**, not only a
compiled rulebase. This file maps every integration to its application path.
Web-grounded as of 2026-06-12; re-verify before each application.

## Tier 0 — live today, no application

| Integration | What | How |
|---|---|---|
| **data.gov.il** | All open government datasets | CKAN REST API, open, no key |
| **CBS (למ"ס)** | Statistics API | Public API, no registration |
| **BTL simulators** | Eligibility logic as web calculators | Public web; scriptable as test oracles (no official API) |
| **Kol Zchut MediaWiki API** | Rights pages, structured wiki | MediaWiki API/dumps are open, **BUT** content license is **CC-BY-NC-SA-2.5-IL — NonCommercial**. Fine for a nonprofit POC with attribution; any commercial use ⇒ must get written permission / partnership (see Tier 3). |

## Tier 1 — formal applications open to any business

1. **רשות המסים — Open API (שע"ם), "חיבור בית תוכנה"**
   - The Tax Authority runs a real developer program for software houses.
   - Process: (a) register the business for digital services at
     signup.taxes.gov.il; (b) business owner grants digital authorization to
     the acting user in the personal area; (c) submit the בית תוכנה
     connection request (נוהל חיבור בית תוכנה, gov.il/he/service/connect-to-shaam);
     (d) get developer-portal credentials.
   - Currently exposed APIs: חשבוניות ישראל, VAT reporting/payment, donation
     receipts — **not** מענק עבודה eligibility. Value: official identity +
     rails with רשות המסים, positioned for whatever opens next.
   - **Prerequisite: a registered legal entity.**

2. **WhatsApp Business Platform (Meta)**
   - Apply via Meta Business Manager: business verification → WhatsApp
     Cloud API (direct, free per-conversation tiers) or via a BSP
     (360dialog/Twilio). Needs a verified legal entity + display-name review.
   - This is the channel application for the conversational front end.

3. **הרשות להגנת הפרטיות — Amendment 13 duties (not access, but required)**
   - PersonState = מידע רגיש (health, finances, family). Under the
     Amendment-13 regime (in force since Aug 2025): database
     notification/registration per thresholds, possibly a DPO (ממונה הגנת
     פרטיות), security regulations tier. File this as part of standing up
     the entity, before holding real user data.

## Tier 2 — restricted access via licensed professionals

4. **BTL — מערכת ייצוג לקוחות / מייצגים בגמלאות**
   - There is **no public BTL API**. The only live, lawful window into a
     person's BTL file is the representatives system, restricted to
     **lawyers / CPAs / tax advisors** holding a signed ייפוי כוח
     (form BL/70 or the online flow). The gimlaot representatives system is
     lawyers-only.
   - Application path: the entity engages (or employs) a licensed
     professional who registers to ייצוג לקוחות; clients sign the POA
     digitally. Product implication: this naturally pushes toward face B
     (copilot for the human מיצוי layer) for live-BTL features.

5. **רשות ניירות ערך — רישיון נותן שירות מידע פיננסי (חוק שירות מידע פיננסי, 2021)**
   - Israel's open-banking law. A licensed provider may, with user consent,
     aggregate financial info (banks, and the framework is expanding across
     financial sectors — relevant to הר הביטוח / המסלקה הפנסיונית data).
   - Real license: application to the ISA, capital/insurance/compliance
     requirements, duty of loyalty. This is the formal long-game path to
     "pull the person's financial state live, with consent."

## Tier 3 — partnership applications (no open program)

6. **Kol Zchut** — for commercial reuse and/or structured feed: approach as
   a nonprofit-mission partner **with a working demo**. Their NC license
   makes this mandatory, not optional, the moment we're not a pure nonprofit.
7. **מערך הדיגיטל הלאומי / mybenefits.gov.il** — no public API; government
   data-transfer frameworks are government-to-government. Path: partnership
   conversation (pilot, or becoming their referral layer). Track the
   "digital citizen file" direction for future official APIs.
8. **Municipalities (ארנונה discounts)** — fragmented, per-municipality;
   pick 1-2 pilot municipalities and apply directly.

## The personal-data reality check

There is **no general "apply for API access to a citizen's government data"
program in Israel today.** Live personal-state data comes from exactly four
lawful doors: (a) the person tells/photographs it; (b) the person logs into
their own אזור אישי and exports (user-driven); (c) a licensed representative
with POA (Tier 2 #4); (d) a licensed financial-info provider (Tier 2 #5).
Everything else is the rulebase side, which is public content.

## Application checklist (orderable today)

- [ ] **Incorporate the entity** (עמותה vs חברה — open question 08-3 now
      becomes blocking: every application below needs the entity first).
- [ ] רשות המסים digital-services registration + בית תוכנה request.
- [ ] Meta Business verification → WhatsApp Cloud API.
- [ ] Privacy Authority: Amendment-13 notification/registration + DPO check.
- [ ] Kol Zchut: written permission/partnership request (with demo).
- [ ] Identify the lawyer/CPA partner for BTL ייצוג לקוחות.
- [ ] (Later, if financial aggregation is wanted) ISA financial-info-service
      license feasibility memo.

## Sources

- שע"ם connection: https://www.gov.il/he/service/connect-to-shaam ;
  registration: https://signup.taxes.gov.il/SrRishum
- BTL POA for representatives: https://www.btl.gov.il/טפסים%20ואישורים/tfassim-mekuvanim/Pages/YPUYCOACH.aspx ;
  gimlaot reps: https://www.btl.gov.il/Pages/MeyatzegGimlaot.aspx
- Kol Zchut license: https://www.kolzchut.org.il/he/כל-זכות:ייחוס ;
  GitHub: https://github.com/kolzchut
- חוק שירות מידע פיננסי: https://he.wikipedia.org/wiki/חוק_שירות_מידע_פיננסי ;
  ISA license requirements: https://www.new.isa.gov.il (הוראה למבקשי רישיון)
