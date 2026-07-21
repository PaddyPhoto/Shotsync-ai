# Cin7 Omni integration — scoping & plan

**Status:** scoping only. Not built. Blocked on a design-partner Omni account to verify against.
**Date:** 2026-07-21

## Why
ShotSync's ICP is established AU fashion brands, which predominantly run **Cin7 Omni**
(native EDI to THE ICONIC / Myer / DJs, 3PL routing, POS). The existing integration is
**Cin7 Core** (former DEAR, `inventory.dearsystems.com`) — right for smaller/DTC brands,
but not what the main pipeline uses. Omni and Core are **different products with different
APIs** (`api.cin7.com` vs Core), so this is a second integration, not a fork.

Interim: the universal `product_data.csv` + processed images already serves Omni brands via
import. Native push is the upgrade, not the unlock.

## Key API findings (from public docs, api.cin7.com/api/Help)
- **Auth:** API-connection **username + key** (basic-auth style). New `brands` credential
  fields + settings UI + test route (mirror `/api/cin7/test`). Distinct from Core's headers.
- **Data model:** `Product` = the style; `ProductOption` = the variant/SKU
  (`productOptionCode`). Split endpoints: `v1/Products`, `v1/ProductOptions`.
  `POST v1/Products` supports **only ONE ProductOption per call** — multi-size needs the
  ProductOptions endpoints. DECISION NEEDED: map a ShotSync cluster to a style, or style+option?
- **Update semantics (clean):** `PUT v1/Products` requires `Id`; *"leave fields null to not
  update, empty to clear."* Native non-destructive enrich — no guessing (better than Core).
  Batch-capable. On create, dedup skips if StyleCode/optionCode already exists → upsert =
  find by StyleCode/optionCode → `PUT` by `Id`.
- **Images:** `GET v1/Products/{id}` returns `images[]` with a `link` (URL) each → can read
  existing to merge. API-writable (recent). **Limits: ≤3MB, jpg/jpeg/gif/png/bmp.** Submit
  format (URL vs base64) UNVERIFIED — `link`-URL shape suggests URL-based (fits our public
  Supabase URL model). **3MB cap → Omni push needs a ≤3MB compressed variant** (our high-res
  exports exceed it).
- **Description capped at 250 chars** 🔴 — rich AI copy + bullets won't fit. Enriched copy
  needs another home (B2B fields, or short-desc + attributes on Omni while full copy stays in
  Shopify/CSV).

## Open questions to verify on a live Omni account
1. Image submit format on POST/PUT — URL (`link`) or base64? Size/format enforced how?
2. Cluster → Product vs ProductOption mapping for the brand's real catalogue.
3. Where the full marketing copy should live given the 250-char Description cap.
4. How SKUs are keyed (StyleCode vs productOptionCode) for find-existing.

## Build outline (once verified)
- `src/lib/cin7/omni-client.ts` — auth, findByStyleCode/optionCode, getProduct,
  createProduct, updateProduct (null-to-skip), image attach (≤3MB variant).
- `brands` columns + secrets masking + settings UI + `/api/cin7-omni/test`.
- Wire into both push paths (export `/api/cin7/upload`-equivalent + products publish) with a
  per-brand "which Cin7 (Core/Omni)?" selector.
- Reuse the export pipeline for a ≤3MB image variant.
- Estimate: a few focused sessions. Test against the design-partner brand throughout.

## Related
- Core upsert (done, unpushed, needs verify): commit `33c2b1e`.
- See memory: project-shotsync-cin7, project-shotsync-us-region (Phase 4 native connectors).
