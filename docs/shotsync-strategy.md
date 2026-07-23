# ShotSync — North-Star Strategy

_Last updated: 2026-07-23. The anchor for roadmap decisions. When a build request comes in,
check it against "the lane" and "what's parked" below before saying yes._

## The one line
**ShotSync turns a fashion shoot into a complete, enriched product listing — images, copy, and
attributes — and delivers it into the brand's store, ready to sell. It's the content-creation
layer nobody upstream owns.**

---

## The spine — Option B (where we already are)

```
RAW SHOOT  →  ShotSync              →  SHOPIFY            →  [the brand's existing stack]
              cluster by SKU           (ecommerce master)     ERP→Shopify inventory sync
              spec/crop/bg images                             syndication tool / ERP EDI → marketplaces
              generate on-brand copy
              fill visual attributes
```

Shoot in → ShotSync produces the enriched listing → pushes it into **Shopify** (where listings
actually live) → the brand's *existing* plumbing takes it the rest of the way. **ShotSync owns
the shoot→Shopify content step. Nothing more, nothing less.**

**We are already at Option B's core today:** content creation ✅ and the Shopify push ✅ both
exist and work (`handleShopifyUpload` / `publishToShopify` create content-rich Shopify drafts:
images, SKU, colour, title/description/bullets, attributes, metafields). We're standing on
Option B, not heading toward it.

---

## Where ShotSync sits — and the discipline of staying there

```
1. CONTENT CREATION  →  2. ECOMMERCE (Shopify/Magento)  →  3. INVENTORY ERP  →  4. MARKETPLACE SYNDICATION
   ShotSync (us)          our destination                   read-only, later     NOT our job (Omnivore/EDI)
```

- **We own:** studio→listing production (images), copy, visual attributes, the enriched record,
  delivery to Shopify (+ Magento next).
- **We deliberately don't:** inventory/stock (the ERP masters it — we only ever *read*),
  marketplace syndication, bulk catalogue data management (that's a PIM), order routing.
- The sentence a brand hears: _"We create and deliver your product content; your stack handles
  inventory, distribution, and orders."_

That discipline is the strategy. It's why we're **not** competing with Omnivore, the ERPs, or
the PIMs — we feed them better input.

---

## The moat
- **Upstream of everyone.** Omnivore/syndication tools start from content *already in Shopify*;
  Okkular and AI-imagery tools do pieces. **ShotSync creates the whole listing from a raw shoot**
  — the hard part none of them do.
- **Fashion-native depth.** View detection, ghost-mannequin, per-view background removal, fashion
  crop logic, brand-voice copy from the brand's own examples.
- **Privacy moat, upgraded.** Imagery lives in the **brand's own cloud** (bring-your-own
  S3/Drive/DAM); ShotSync holds references, not files. **Durable *and* private** — which
  "on-device" never was.

---

## Platform evolution — from tool to stack component (affordable, no raise)
The one expensive thing (cloud-storing imagery) is sidestepped: **store references, not masters.**
1. **Server-side product record** — the enrichment persists (the "center of gravity"). Reuses the
   Products/CRM catalog + `upsertProducts` that already exist. Keystone wire: shoot-confirm →
   upsert into the catalog (fill-only merge — never clobber ERP/imported data).
2. **BYO-cloud imagery** — full-res masters live in the brand's cloud (or Shopify after push);
   ShotSync holds records + thumbnails + pointers. Cheap for us; the full-res bill is the brand's.
   Optional **paid managed-storage tier** for brands with no cloud (pass-through, opt-in).
3. **Multi-user** — a team system, not a single-machine app.

None of this needs funding — it's dev time on infra we already run (Supabase, auth).

**Two-worlds note:** the recurring "which world" friction (copy in session vs catalog, barcode
only in catalog, blank CSV) is the *same* bug — product data duplicated across the shoot session
and the Products catalog. The catalog IS the built enriched-record center (import from
CSV/Cin7/Shopify → products/listings/variants/attributes; publish; extension reads it). The fix
is the keystone wire above: make the shoot **feed the one catalog** (upsert), so "create" and
"enrich" collapse into one upsert and the two worlds merge. Images stay session/on-device→cloud;
only the *data* consolidates.

---

## Data sovereignty (the trust story)
_"We hold the shop-window content we create for you — copy, attributes, image references — linked
to your SKUs. Your product data stays in your ERP; your imagery stays in your cloud. We never hold
your cost, margin, or inventory."_ Stronger than on-device, and honest.

Assumption: for established brands, **the SKU already exists in their ERP** (created at buying/PO).
ShotSync **enriches** it (import → enrich → push the content to ecommerce/marketplaces, NOT back to
the ERP). "Create from scratch" is the fallback (DTC/emerging, no ERP) — a thin shell.

---

## Competitive landscape
- **Omnivore** (omnivore.com.au / .co) — marketplace **syndication** platform (layer 4). Pulls
  existing product data from Shopify/Magento → optimises + pushes to marketplaces (Amazon, eBay,
  Myer, DJ, ICONIC, Woolworths, Temu, Uber Eats, Bunnings…) + real-time inventory sync + orders.
  **Horizontal generalist**, not fashion-native. Does image resize/rename per marketplace spec,
  but only on images *already in Shopify* — can't create content from a shoot. **Adjacent /
  potential partner, not a core competitor.** We're upstream; they're downstream.
- **Okkular** — AI catalogue-enrichment (attributes/copy/discovery). Overlaps on copy/attributes;
  they enrich existing data, we produce assets from the raw shoot. See [[reference-competitor-okkular]].
- **AI-imagery tools** (Stylitics, WearView, etc.) — do pieces of imagery, not the full pipeline.

---

## What's PARKED — Option A (future, optional)
Becoming a **fashion-native syndication layer**: read inventory from ERPs, push complete listings
to marketplaces (**Marketplacer** → Myer/DJ; **THE ICONIC SellerCenter** — these are ~2 platform
integrations, not many), real-time stock sync + orders. **This IS what Omnivore does** — the
"read → assemble → push to marketplace + inventory" loop. Bigger, later, optional; competes
head-on and carries the operational (oversell/orders) burden. **Not required for a complete
product.** Revisit only when a design-partner brand *demands* direct marketplace push and will be
the test account.

**If/when Option A: the ERP-read scope is region-aware** (matches the au/us region model), and it
is READ-only (pull price/stock/size/barcode) — content is never pushed into the ERP:
- **AU:** Cin7 (Core/Omni), Apparel21, Indigo8, Shopify
- **US:** NetSuite (dominant, horizontal, scaled brands), AIMS360 (fashion-native, US SMB–mid,
  $1M–$500M — likely the easier first US integration), Cin7 (US DTC), Shopify
- **Simplification to weigh first:** read inventory from **Shopify** (one integration — where
  stock already sits via the brand's ERP→Shopify sync) instead of each ERP directly. ERP-direct
  reads only earn their keep for wholesale-only brands with no Shopify store.
- Deferred: ApparelMagic, Uphance (smaller US); SAP/Infor/Dynamics (enterprise).

---

## Roadmap (Option B spine)
1. **Attributes** — CV vision-fill (colour family, pattern, neckline, sleeve, fit, length,
   occasion, category) → Shopify metafields / product record. Visual attributes only; never
   invent spec-sheet facts (composition/care/origin/RRP stay blank unless supplied). Ground colour
   to the brand's palette; human-confirm. Kills the "blank record" problem.
2. **Durable product record** — the shoot-confirm → `upsertProducts` keystone wire (fill-only).
3. **BYO-cloud imagery** — references not masters.
4. **Multi-user** — team stack tool.
5. **Magento** push — broaden the ecommerce destination.
6. _(Parked)_ **Option A** — marketplace push/orchestrator, if ever.

Already shipped toward this: Sonnet 5 copy upgrade; **channel-variant copy** (master=Shopify /
marketplace / feed) live; export polish (fit-to-crop, cancel, filename UX); Cin7 Core upsert
(built, now DEPRIORITISED under Option B — content doesn't live in the ERP); Omni scaffolding
(parked with Option A).

---

## Why this is the right north-star
Matches **where we already are** (Option B's core today); **affordable** (no storage bill, no
raise); keeps us in the **one lane we own** (content); **strengthens** the privacy moat instead of
abandoning it; makes ShotSync a **serious, durable stack component** — without becoming a
syndication tool or a PIM.

**In a sentence:** _ShotSync is the fashion-native content layer that turns a shoot into a
shelf-ready listing in your store — durable, private, and deliberately upstream of inventory and
distribution._
