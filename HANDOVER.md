# ShotSync.ai — Developer Handover Document

**Product:** ShotSync.ai — fashion eCommerce post-production automation SaaS (shoot images → marketplace-ready, named, copy-enriched listings).
**Repo folder:** `framesops-ai` (legacy working name; product rebranded FramesOps → ShotSync).
**Repo:** https://github.com/PaddyPhoto/Shotsync-ai
**Live:** https://www.shotsync.ai (www is canonical; auto-deploys on push to `main` via Vercel).
**Owner:** photoworkssydney@gmail.com

> This doc reflects the codebase as of **June 2026** (Next.js 16 + React 19, after the export-UI consolidation). It supersedes the April 2026 version. `DOCUMENTATION.md` is an older, longer reference — trust this file where they disagree.

---

## 0. Getting the Code

This document lives **inside the repo** (`HANDOVER.md` at the root), so cloning the repo gives you the entire codebase **and** this doc together. Every file path referenced below (e.g. `src/components/export/ExportView.tsx`) is relative to the repo root and opens directly in your editor.

1. **Get repo access** — the owner (photoworkssydney@gmail.com) adds you as a collaborator on GitHub: repo → **Settings → Collaborators**.
2. **Clone it:**
   ```bash
   git clone https://github.com/PaddyPhoto/Shotsync-ai.git
   cd Shotsync-ai
   ```
3. **Open the folder** in your editor (VS Code, etc.) and read this file first, then jump to the referenced paths.
4. **Run it** — see §13 (Local Development) for install / env / dev-server steps.

| | |
|---|---|
| **GitHub (source of truth)** | https://github.com/PaddyPhoto/Shotsync-ai |
| **Default branch** | `main` (auto-deploys to production on push) |
| **Live production** | https://www.shotsync.ai |
| **Hosting** | Vercel (project `shotsync-ai`) |

> The repo is the live truth — this doc explains *how it's organised and why*, but never pastes code (pasted snippets go stale). Always read the actual files.

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | **16.2.9** |
| Runtime | React / React DOM | **19.2.7** |
| Language | TypeScript | 5 |
| Node | ≥ 20.9 (Vercel default 24) | — |
| Styling | Tailwind CSS | 3.4 |
| DB / Auth / Storage | Supabase (Postgres + Auth + Storage) | supabase-js 2.43 |
| AI — copy & classification | Anthropic Claude (`@anthropic-ai/sdk`) | Sonnet 4.6 + Haiku 4.5 |
| AI — embeddings & accessory class. | OpenAI | — |
| Billing | Stripe | 21 |
| Email | Resend (sender: hello@shotsync.ai) | 6 |
| Image processing | Sharp (server) + Canvas (client) | 0.33 |
| ZIP / spreadsheet | JSZip / xlsx | — |
| State | Zustand + TanStack React Query | 4.5 / 5.51 |
| Monitoring | Sentry | 10 |
| Clustering (legacy server path) | ml-kmeans + ml-distance | 3.0 / 4.0 |
| Background removal (inert) | @imgly/background-removal + onnxruntime-web | retired — see §10 |
| Tests | Vitest | 2 |

### Build note — Turbopack is intentionally disabled
`dev`/`build` scripts pin **`--webpack`** (`next dev --webpack`, `next build --webpack`). Next 16 defaults to Turbopack, which ignores the custom `webpack()` config in `next.config.mjs` that resolves `onnxruntime-web` to its WASM build (used by the dormant background-removal fallback). Removing that dependency (see §10) would let you drop the pin and adopt Turbopack.

---

## 2. Project Structure

```
src/
├── app/
│   ├── (auth)/                 # login / signup
│   ├── auth/                   # Supabase OAuth callback, confirm-email, reset
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard home (brand-setup hero when no brands)
│   │   ├── upload/             # Upload + folder ingestion → processFiles (§6)
│   │   ├── review/             # Cluster review/confirm + AI copy + renders <ExportView>
│   │   ├── jobs/[jobId]/        # Saved-job detail, review, validation, download,
│   │   │   └── export/          #   export route → thin wrapper around <ExportView>
│   │   ├── products/           # PIM product list + detail
│   │   ├── brands/ marketplaces/ integrations/ settings/ admin/
│   ├── api/                    # All API routes (§4)
│   ├── invite/[token]/ enter/  # org invites, password gate
│   ├── faq/ privacy/ terms/ us/ what-is-shotsync/   # static/marketing
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout (metadata, GA4, LinkedIn, JSON-LD)
│   ├── sitemap.ts robots.ts
├── components/
│   ├── export/ExportView.tsx   # ⭐ Single shared export UI (both entry points)
│   ├── export/MarketplaceSelector.tsx
│   ├── layout/ (Sidebar, Topbar, BrandSwitcher) onboarding/ help/ ui/ …
├── lib/
│   ├── processor/              # ⭐ Client-side upload→clusters (filename/folder, §6)
│   ├── export/image-processing.ts  # Canvas resize/crop/compose; @imgly fallback (inert)
│   ├── pipeline/               # Legacy/server processing path (embeddings + k-means, §6)
│   ├── plans/                  # Plan matrix + feature gates (§7)
│   ├── supabase/               # Client factories + getOrgForUser helper (§8)
│   ├── marketplace/            # Per-brand marketplace rules + formatting
│   ├── brands/ products/ shopify/ cin7/ sellercenter/ cloud/ email/ naming/
│   ├── accessories/ garment-categories.ts angle-utils.ts session-store/ folder-store/
│   ├── rateLimit.ts re-engagement.ts activity.ts
├── store/session.ts            # ⭐ Zustand session store (active job, §5)
├── context/                    # PlanContext, BrandContext
├── types/index.ts              # Shared types (MarketplaceName, Job, etc.)
├── middleware.ts               # Auth gate + SITE_PASSWORD gate + geo routing
└── instrumentation.ts / instrumentation-client.ts   # Sentry init
```

---

## 3. Environment Variables

Source of truth is **Vercel → Project → Settings → Environment Variables**. Pull locally with `vercel env pull .env.local`. ⚠️ Vercel writes values **double-quoted** — strip surrounding quotes if copying a single value into another tool (e.g. a GitHub secret).

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; bypasses RLS

# AI
ANTHROPIC_API_KEY=                # Claude — product copy, angle/garment classification
OPENAI_API_KEY=                   # embeddings (server pipeline) + accessory classification
REPLICATE_API_TOKEN=              # used by the (now-inert) bg-removal pre-pass

# Stripe (monthly + annual + USD price IDs per paid plan)
STRIPE_SECRET_KEY=  STRIPE_WEBHOOK_SECRET=  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID(+_ANNUAL/_USD/_ANNUAL_USD)=     # internal id "launch"
NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID(...)=                            # internal id "growth"
NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID(...)=

# Email / integrations
RESEND_API_KEY=
SHOPIFY_CLIENT_ID=  SHOPIFY_CLIENT_SECRET=        # OAuth app (per-brand token stored in DB)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=  NEXT_PUBLIC_GOOGLE_API_KEY=  GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_DROPBOX_APP_KEY=  DROPBOX_APP_SECRET=

# App
NEXT_PUBLIC_APP_URL=  NEXT_PUBLIC_SENTRY_DSN=  NEXT_PUBLIC_AI_DETECTION=
SITE_PASSWORD=                    # optional early-access gate (middleware)
CRON_SECRET=                      # guards /api/cron/* (re-engagement)
```
> Per-brand AWS S3 credentials are stored in the `brands` table, not env vars.

---

## 4. Key API Routes

All under `src/app/api/`. **Auth pattern:** most routes authenticate the bearer token via `createServiceClient()` + `getOrgForUser()` (see §8). ~110 routes total; the important ones:

| Area | Routes |
|------|--------|
| Billing | `billing/checkout`, `billing/portal`, `billing/subscribe`, `billing/plan`, `billing/usage`, `billing/bg-removal`, **`billing/webhook`** (Stripe — must be **www**) |
| Jobs | `jobs`, `jobs/[jobId]`, `jobs/[jobId]/process` (server pipeline), `jobs/[jobId]/session` (cross-device restore), `jobs/history`, `jobs/detect-angles` (Claude) |
| Clusters/Products | `clusters/[clusterId]`, `products`, `products/[productId]`, `products/[productId]/publish`, `products/match-skus`, `products/import/{shopify,cin7}` |
| AI | `copy/generate` (Claude Sonnet), `classify-garment` (Claude Haiku), `ai/classify-accessory` (OpenAI) |
| Export/Brands | `export`, `export/zip`, `brands`, `brands/[brandId]`, `brands/[brandId]/marketplace-rules` |
| Shopify | `shopify/{connect,callback,install,upload,stage-image}`, `shopify/webhooks/*` (GDPR) |
| Cin7 | `cin7/test`, `cin7/upload` |
| Cloud | `integrations/{google,dropbox,s3}/*` |
| Orgs | `orgs/me`, `orgs/members`, `orgs/invite(/accept)` |
| Admin/Cron | `admin/*` (broadcast, set-plan, users, re-engagement), `cron/re-engagement` |
| Extension | `extension/{token,verify,products,listing-payload}` (browser extension) |

---

## 5. State — Zustand session store (`src/store/session.ts`)

In-memory state for the **active job**, persisted to `sessionStorage` + IndexedDB. Both export entry points read from here.

```ts
{ jobName, clusters: SessionCluster[], marketplaces, styleList, shootType,
  imagesPerLook, angleSequence, isReady, undoStack }
```
`SessionCluster`: `{ id, images[], sku, productName, color, colourCode, styleNumber, label,
category, garmentCategory, isBottomwear, confirmed, incomplete, exported,
copyDescription?, copyBullets?, productId?, listingId? }`
`SessionImage`: `{ id, file, previewUrl, filename, folder?, seqIndex, viewLabel, viewConfidence }`

- **Parked jobs** (`lib/session-store`, IndexedDB) — park/resume multiple in-progress jobs.
- **Cross-device restore** — after export, cluster metadata is saved to Supabase (`/api/jobs/[jobId]/session`); on reopen it reloads from IDB → cloud → remembered folder handles (`lib/folder-store`).
- `reset()` must clear in-memory state + `sessionStorage['shotsync:session']` + `['shotsync:reimport']`.

---

## 6. Processing — two paths

**A) Interactive upload (primary)** — `src/lib/processor/processFiles()`, fully **client-side** (images never leave the browser unless pushed/exported to a cloud target). The upload page (drag-drop or folder picker) calls it. Clustering is **3-tier** (see `project_clustering_skus` logic):
1. **Sub-folder per SKU** — folder upload → one cluster per sub-folder, SKU = folder name.
2. **Filename key** — flat files like `WD2451_NAVY_01.jpg` → group by stripped key.
3. **Fixed chunk** — sequential names → chunk by images-per-look, SKU = first image's full filename.
Angles are assigned **positionally** from the brand's shoot sequence (not AI). AI copy (Claude) is generated on demand in the review page.

**B) Server pipeline (legacy/secondary)** — `src/lib/pipeline/` `runPipeline()`, invoked by `POST /api/jobs/[jobId]/process`. Uses OpenAI embeddings + ml-kmeans clustering + Sharp formatting (steps `step1`…`step10`). Predates path A; verify whether a given flow still routes through it before relying on it.

**Export** — `src/components/export/ExportView.tsx` is the **single shared export UI** for both the live-session export (Review → Export) and the saved-job export route. Supports ZIP / save-to-folder / cloud (Dropbox/Drive/S3), per-marketplace resize/crop/naming, a rich `product_data.csv`, and direct Shopify + Cin7 push.

---

## 7. Plans & Billing (`src/lib/plans/index.ts`)

Internal plan IDs: **`free` · `launch` · `growth` · `scale` · `enterprise`** (display names Free / Launch / Growth / Scale / Enterprise — note the old "Starter/Brand" names are gone).

| Plan | AUD/mo | SKUs/mo | Brands | Marketplaces | AI Copy | BG Removal* |
|------|--------|---------|--------|--------------|---------|-------------|
| free | 0 | 50 | 1 | 1 | ✗ | ✗ |
| launch | 79 | 200 | 1 | 2 | ✗ | ✗ |
| growth | 199 | 1,000 | 2 | 4 | ✓ | ✓ |
| scale | 399 | 2,500 | 5 | 4 | ✓ | ✓ |
| enterprise | custom | ∞ | ∞ | 4 | ✓ | ✓ |

\* BG removal is gated in the plan matrix but the feature is currently retired (§10).

- Plan lives in `orgs.plan`, updated **only** by the Stripe webhook (`checkout.session.completed`).
- **Webhook URL must be `https://www.shotsync.ai/api/billing/webhook`** (no-www 307-redirects and Stripe won't follow).
- Plan gating is enforced via `getOrgForUser()` + `PLANS[planId].limits.*`. Tests in `src/lib/plans/plans.test.ts` + `src/lib/supabase/getOrgForUser.test.ts` guard this.

---

## 8. Auth Pattern (`src/lib/supabase/`)

- `createClient()` — browser/cookie client.
- `createServiceClient()` — service role, bypasses RLS, **server-only**.
- `getOrgForUser(supabase, userId)` — resolves a user's org via `owner_id`, then `org_members` fallback. **Use this to resolve org/plan in API routes** — never assume `orgs.id === user.id` (they're different UUIDs; assuming so caused a real plan-gating bug).
- Standard API auth: read the bearer token from the `Authorization` header and validate with `service.auth.getUser(token)`. Client fetches must send `Authorization: Bearer <session.access_token>`.
- **New Supabase tables** must include explicit `grant`s + RLS (Supabase is removing auto-exposure of public-schema tables).
- `middleware.ts`: `SITE_PASSWORD` gate, session recovery, `/`→`/dashboard` when authed, geo-routing (US → `/us`).

---

## 9. Integrations

| Service | Purpose | Credentials |
|---------|---------|-------------|
| Supabase | DB/Auth/Storage (incl. `shopify-temp` bucket for push staging) | env |
| Anthropic | Product copy + classification | env (`ANTHROPIC_API_KEY`) |
| OpenAI | Embeddings + accessory classification | env (`OPENAI_API_KEY`) |
| Stripe | Subscriptions | env |
| Resend | Transactional email | env |
| Shopify | OAuth app; create draft products | per-brand token in `brands.shopify_access_token` |
| Cin7 Core | Push enriched product records | per-brand keys on `brands` |
| Google Drive / Dropbox / S3 | Import source images | per-brand / OAuth |
| Sentry | Error tracking | env |

**Marketplaces (5):** the-iconic, myer, david-jones, shopify, joor — specs in `src/lib/marketplace/rules.ts`, overridable per-brand (`marketplace_rules` table).

---

## 10. Known State / Deferred Cleanups

- **Background removal is retired but inert.** `ExportView` has `const bgRemovalEnabled = false`; the toggle UI is removed but the plumbing + `@imgly/background-removal` + onnxruntime config remain. To **re-add**: restore the toggle that sets `bgRemovalEnabled`. To **fully remove**: delete the dormant code + the `@imgly`/onnxruntime dependency + the `next.config.mjs` webpack block, then drop the `--webpack` pin to adopt Turbopack.
- **`xlsx`** has an unfixable advisory (prototype pollution / ReDoS) — only used to parse the user's own uploaded style list; no upstream fix.
- **Sentry config deprecations** — `disableLogger`, `automaticVercelMonitors`, and a missing `onRequestError` hook (warnings only).
- **`lib/pipeline`** (embeddings/k-means) overlaps with the newer client-side `lib/processor` — candidate for audit/removal if the `/process` route is no longer needed.

---

## 11. Ops, Testing & CI

- **Tests:** `npm test` (Vitest). Currently covers plan gating + org resolution. No e2e — export flows are validated manually on a Vercel preview before merge.
- **Type/build gate before pushing:** `npx tsc --noEmit` && `npm run build`.
- **Weekly health check:** a GitHub Actions workflow (`.github/workflows/health-check.yml` + `scripts/health-check.mjs`) runs every Monday — `tsc` + `npm test` + `npm audit` — and emails a summary to hello@shotsync.ai via Resend. (Pushing workflow files needs a PAT with the `workflow` scope.)
- **Deploy:** push to `main` → Vercel production. Feature branches get protected preview URLs (log into Vercel to view). `/api/export` and AI routes run with extended function timeouts.

---

## 12. Critical Files

| File | Why |
|------|-----|
| `src/components/export/ExportView.tsx` | The entire export flow (both entry points) |
| `src/lib/processor/index.ts` | Upload → clusters (3-tier clustering, angle assignment) |
| `src/store/session.ts` | Active-job state shape + actions |
| `src/lib/plans/index.ts` | Plan matrix + feature gates |
| `src/lib/supabase/{server.ts,getOrgForUser.ts}` | Auth + org/plan resolution |
| `src/app/api/billing/webhook/route.ts` | Stripe → plan updates |
| `src/middleware.ts` | Auth + password gate + geo routing |
| `next.config.mjs` | Build config, onnxruntime webpack externals, Sentry |
| `src/types/index.ts` | Shared types |

---

## 13. Local Development

```bash
npm install
vercel env pull .env.local        # or: cp .env.example .env.local and fill in
npm run dev                       # → http://localhost:3000  (Next 16, webpack)
npm test                          # Vitest
npx tsc --noEmit && npm run build # pre-push gate
```
Branch off `main`, verify on a Vercel preview, then merge. Never commit secrets; `.env*` is gitignored.

---

*Last updated: June 2026 (Next.js 16 + React 19; post export-UI consolidation).*
