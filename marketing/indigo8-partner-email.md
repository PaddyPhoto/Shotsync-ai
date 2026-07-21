# Indigo8 partner-access outreach email

**Purpose:** request Indigo8 integration-partner / API access + sandbox so ShotSync can
build a native Indigo8 destination. Indigo8 has no public API docs — access is via their
partner program, so this BD email is the required first step before any engineering.

**To:** Indigo8 Solutions — partnerships / integrations team (find via indigo8-solutions.com
/integration-partners contact, or their support). **From:** ShotSync founder.

Adjust the name/signature before sending.

---

**Subject:** Integration partnership enquiry — ShotSync (automated product imagery → Indigo8)

Hi Indigo8 team,

I'm the founder of **ShotSync** (shotsync.ai) — software that turns a fashion brand's raw
product photography into complete, enriched product records: it clusters shots by SKU
automatically, resizes and crops to each destination's spec, generates listing copy, and
delivers the finished records (images + metadata) into the brand's system of record.

Several brands we work with run **Indigo8**, and the natural last step in our pipeline is to
push finished product records straight into Indigo8 instead of via manual import. We already
integrate natively with Shopify and are building Cin7 Omni — Indigo8 is a priority for our AU
fashion customers.

I'd like to build an official Indigo8 integration. Could you point me to:

1. Your integration/partner program and how to join,
2. API documentation for creating/updating products and attaching product images (auth,
   endpoints, size/format limits), and
3. A sandbox or test account we can build and verify against.

Happy to jump on a quick call. Looking forward to saving our mutual customers the
photography-to-listing grind.

Best,
Paddy
Founder, ShotSync · shotsync.ai · photoworkssydney@gmail.com

---

**After they reply:** scope their API like the Omni plan (docs/cin7-omni-integration-plan.md)
and build it as a second `ErpAdapter` (src/lib/integrations/erp-adapter.ts).
