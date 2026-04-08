# ShotSync.ai — Full Project Documentation

> Written April 2026. Covers all features built to date. Intended for handoff to a human developer or as a reference for future AI-assisted development.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Tech Stack](#2-tech-stack)
3. [Services & Infrastructure](#3-services--infrastructure)
4. [Environment Variables](#4-environment-variables)
5. [Project Structure](#5-project-structure)
6. [Core Data Model](#6-core-data-model)
7. [Session State (Zustand)](#7-session-state-zustand)
8. [User Workflow — Step by Step](#8-user-workflow--step-by-step)
9. [Upload Page](#9-upload-page)
10. [Review Page](#10-review-page)
11. [Export Logic](#11-export-logic)
12. [Marketplace Rules](#12-marketplace-rules)
13. [Image Naming System](#13-image-naming-system)
14. [Shoot Types](#14-shoot-types)
15. [Accessory Categories](#15-accessory-categories)
16. [View / Angle Labels](#16-view--angle-labels)
17. [AI Detection (GPT-4o-mini)](#17-ai-detection-gpt-4o-mini)
18. [Brand Settings](#18-brand-settings)
19. [Style List Import (CSV/XLSX)](#19-style-list-import-csvxlsx)
20. [Billing & Plans (Stripe)](#20-billing--plans-stripe)
21. [Authentication & Organisations](#21-authentication--organisations)
22. [Database Schema](#22-database-schema)
23. [API Routes](#23-api-routes)
24. [Pipeline Architecture (Legacy)](#24-pipeline-architecture-legacy)
25. [Deployment](#25-deployment)
26. [Known Limitations & Future Work](#26-known-limitations--future-work)

---

## 1. What This App Does

ShotSync.ai is a web application for fashion eCommerce post-production teams. It sits between a retouched image delivery folder and marketplace uploads.

**The core job:**
1. A retoucher delivers a folder of images from a product shoot (could be 50–2000 images).
2. The coordinator uploads them to ShotSync.
3. The app automatically groups them into clusters (one cluster = one product/look/SKU).
4. It detects the shot angle of each image (front, back, side, detail, etc.).
5. The user reviews and corrects the clusters, assigns SKU codes.
6. They choose which marketplaces to export for (THE ICONIC, Myer, David Jones, Shopify).
7. The app resizes, renames, and packages each image per marketplace requirements.
8. The user downloads a ZIP per marketplace, ready to upload directly.

**Supported workflows:**
- **On-Model clothing** — standard fashion apparel shot on a human model
- **Still-Life accessories** — bags, shoes, jewellery, etc. shot on a surface without a model
- **Ghost Mannequin** — garment on an invisible mannequin (position preference: first or last image)
- **Flat-Lay** — product photographed flat from above

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| State Management | Zustand |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | OpenAI GPT-4o-mini (angle + colour + category detection) |
| Image Processing | Browser Canvas API (client-side) |
| ZIP Export | JSZip (DEFLATE level 1 for speed) |
| Payments | Stripe (Checkout + Customer Portal + Webhooks) |
| Deployment | Vercel |
| Source Control | GitHub |
| Excel Parsing | xlsx (SheetJS) |

---

## 3. Services & Infrastructure

### GitHub
- Repository hosts all source code
- Vercel is connected to GitHub and auto-deploys on every push to `main`
- URL: your GitHub repo

### Vercel
- Hosts the Next.js app (serverless functions for API routes)
- Environment variables are set in Vercel project settings
- Auto-deploys on push to `main`
- Preview deployments on pull requests

### Supabase
- **Database**: PostgreSQL with Row Level Security (RLS). Each user only sees their own data.
- **Auth**: Email/password sign-up and login. Supabase handles sessions and JWT tokens.
- **Storage**: Two private buckets — `shoots` (original uploads) and `exports` (generated ZIPs)
- **pgvector extension**: Used for storing image embedding vectors for AI clustering

### OpenAI
- Used for two things:
  1. **Image embeddings** (step2-embeddings.ts) — converts images to vectors for clustering
  2. **Angle/colour/category detection** (api/ai/detect) — GPT-4o-mini classifies shot angles
- Only active when `NEXT_PUBLIC_AI_DETECTION=true` and `OPENAI_API_KEY` is set
- App falls back to filename heuristics and canvas pixel sampling if OpenAI is not configured

### Stripe
- Handles subscription billing (Free / Pro $29/mo / Business $99/mo)
- Checkout, Customer Portal, and Webhook endpoints are implemented
- Plans are enforced via `PlanContext` — gates features like number of brands and marketplaces

---

## 4. Environment Variables

Set these in Vercel project settings (and in `.env.local` for local development).

```env
# Supabase — required for auth, database, storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only

# OpenAI — optional, enables AI detection
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_AI_DETECTION=true                      # set to "true" to enable

# Shopify — optional, enables product catalogue sync
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...

# Stripe — optional, omit to run without billing
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Important:** `NEXT_PUBLIC_` variables are embedded in the browser bundle. Do not put secret keys in them. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `OPENAI_API_KEY` are server-only.

---

## 5. Project Structure

```
framesops-ai/
├── src/
│   ├── app/                          # Next.js App Router pages + API routes
│   │   ├── (auth)/                   # Login and signup pages (unauthenticated)
│   │   ├── api/                      # Server-side API routes
│   │   │   ├── ai/detect/            # POST — AI angle/colour/category detection
│   │   │   ├── billing/              # Stripe checkout, portal, webhook
│   │   │   ├── brands/               # Brand CRUD
│   │   │   ├── clusters/             # Cluster updates
│   │   │   ├── export/               # Export trigger + ZIP generation
│   │   │   ├── jobs/                 # Job management + history
│   │   │   ├── orgs/                 # Organisation + team invites
│   │   │   ├── shopify/              # Shopify product sync
│   │   │   └── upload/               # Image upload handler
│   │   ├── auth/callback/            # Supabase OAuth callback
│   │   ├── dashboard/
│   │   │   ├── upload/page.tsx       # Step 1: Upload + configure session
│   │   │   ├── review/page.tsx       # Step 2: Review clusters + export
│   │   │   ├── settings/page.tsx     # Brand management
│   │   │   └── jobs/[jobId]/         # Legacy server-side job pages (kept for history)
│   │   ├── invite/[token]/           # Team invite acceptance
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   │
│   ├── components/
│   │   ├── billing/                  # UpgradeModal, UsageBar
│   │   ├── clusters/                 # ClusterCard, ClusterGrid
│   │   ├── layout/                   # Sidebar, Topbar, BrandSwitcher
│   │   ├── upload/                   # DropZone, FileList
│   │   ├── export/                   # MarketplaceSelector
│   │   ├── validation/               # ValidationPanel
│   │   └── download/                 # DownloadCard
│   │
│   ├── context/
│   │   ├── BrandContext.tsx          # Active brand state (persists across pages)
│   │   └── PlanContext.tsx           # Current user plan + usage limits
│   │
│   ├── lib/
│   │   ├── accessories/categories.ts # 9 accessory categories with angle sequences
│   │   ├── brands/index.ts           # Brand type, CRUD functions, naming helpers
│   │   ├── marketplace/rules.ts      # 4 marketplace rules (dimensions, naming, etc.)
│   │   ├── naming/useNamingRules.ts  # Naming token hook
│   │   ├── pipeline/                 # 10-step server-side processing pipeline (legacy)
│   │   │   ├── step1-store.ts        # Upload to Supabase Storage
│   │   │   ├── step2-embeddings.ts   # OpenAI image embeddings
│   │   │   ├── step3-clustering.ts   # K-means cosine similarity clustering
│   │   │   ├── step4-clusters.ts     # Persist clusters to DB
│   │   │   ├── step5-shopify-match.ts# SKU matching from Shopify
│   │   │   ├── step6-angle-detection.ts # Filename + AI angle detection
│   │   │   ├── step7-missing-shots.ts # Required shot validation
│   │   │   ├── step8-naming.ts       # Apply naming template
│   │   │   ├── step9-marketplace-format.ts # Resize/crop per marketplace
│   │   │   └── step10-export.ts      # Build ZIP archives
│   │   ├── plans/index.ts            # Plan definitions + limit helpers
│   │   ├── processor/index.ts        # Client-side upload processor (active path)
│   │   ├── shopify/client.ts         # Shopify API client
│   │   ├── supabase/                 # Supabase client + server helpers
│   │   └── utils.ts                  # General utilities
│   │
│   ├── store/
│   │   ├── session.ts                # Zustand: in-memory cluster state for current job
│   │   └── uploadStore.ts            # Zustand: upload progress state
│   │
│   ├── types/index.ts                # All shared TypeScript types
│   └── middleware.ts                 # Auth middleware (redirects unauthenticated users)
│
├── public/                           # Static assets
├── src/lib/supabase/schema.sql       # Database schema — run once in Supabase SQL editor
├── .env.example                      # Template for environment variables
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 6. Core Data Model

### Types (src/types/index.ts)

```typescript
// All possible shot angles
type ViewLabel =
  | 'front' | 'back' | 'side' | 'detail' | 'mood' | 'full-length'
  | 'ghost-mannequin' | 'flat-lay'
  | 'top-down' | 'inside' | 'front-3/4' | 'back-3/4'
  | 'unknown'

type MarketplaceName = 'the-iconic' | 'myer' | 'david-jones' | 'shopify'

type ShootType = 'on-model' | 'still-life'  // (in store/session.ts)
```

### Session Cluster (in-memory, src/store/session.ts)

```typescript
interface SessionCluster {
  id: string
  images: SessionImage[]
  sku: string           // assigned SKU code
  productName: string
  color: string         // detected or user-set colour
  label: string         // display label e.g. "Look 3" or "Product 3"
  category: string | null  // accessory category id ('bags', 'shoes', etc.) — null for on-model
  confirmed: boolean
}

interface SessionImage {
  id: string
  file: File            // original File object (not serialised to sessionStorage)
  previewUrl: string    // object URL for display
  filename: string
  seqIndex: number      // original sort order
  viewLabel: ViewLabel
  viewConfidence: number
}
```

---

## 7. Session State (Zustand)

`src/store/session.ts` is the central state store. It holds the entire current job in memory.

**State fields:**
- `jobName` — name of the current job
- `clusters` — array of SessionCluster
- `marketplaces` — selected marketplace IDs for export
- `styleList` — imported SKU list (from CSV/XLSX)
- `shootType` — `'on-model'` | `'still-life'`
- `accessoryCategory` — legacy field (now per-cluster, kept for compatibility)
- `isReady` — true when a session has been loaded

**Key actions:**
- `setSession(jobName, clusters, marketplaces)` — initialises session + persists metadata to `sessionStorage` (File objects cannot be serialised)
- `moveImage(imageId, toClusterId)` — moves one image between clusters
- `mergeCluster(fromId, toId)` — merges all images from one cluster into another
- `splitImages(fromClusterId, imageIds)` — creates a new cluster from selected images
- `updateClusterSku(clusterId, sku, productName)` — sets the SKU
- `setClusterCategory(clusterId, category)` — sets accessory category per cluster
- `reorderImages(clusterId, fromIdx, toIdx, activeAngles)` — drag-and-drop reorder + relabels
- `relabelCluster(clusterId, activeAngles)` — reassigns view labels to images in order
- `deleteCluster` / `deleteImages` — removal operations
- `confirmCluster` / `setAllConfirmed` — confirmation status
- `reset()` — clears everything including sessionStorage

**Note on sessionStorage:** When the user navigates away and back, session metadata (not File objects) is restored from `sessionStorage` under key `shotsync:session`. This allows back-navigation to work. File objects are gone when navigating away — the review page detects this and prompts re-upload.

---

## 8. User Workflow — Step by Step

```
1. /dashboard/upload
   ├── Drop image files
   ├── Set job name
   ├── Select brand
   ├── Choose Shoot Type: On-Model or Still Life
   ├── Set images per look (default: 4)
   ├── Optionally import style list (CSV/XLSX) for SKU autocomplete
   └── Click "Process" → runs client-side processor

2. Client-side processor (src/lib/processor/index.ts)
   ├── Sort files by filename (natural sort)
   ├── Detect angle from filename keywords
   ├── Chunk into clusters by fixed image count
   ├── Sort images within each cluster by VIEW_ORDER
   ├── Detect colour (filename keywords → canvas pixel sampling)
   └── If AI enabled: send to /api/ai/detect for angle + colour + category

3. /dashboard/review
   ├── Shows all clusters with images
   ├── User reviews, splits/merges/moves images
   ├── Assigns SKU per cluster (manually or from style list dropdown)
   ├── Sets category per cluster (still-life only)
   ├── Confirms each cluster when satisfied
   └── Opens export panel (sidebar Export link or ?export=1 URL)

4. Export panel (inside review page)
   ├── Select marketplaces
   ├── Set custom naming template (optional, for Shopify only)
   ├── Click Export
   ├── Client-side canvas processing: resize + rename per marketplace
   └── Download ZIP files
```

---

## 9. Upload Page

**File:** `src/app/dashboard/upload/page.tsx`

Key features:
- **Drag-and-drop zone** with multi-file support (no file type restrictions — accepts JPG, PNG, TIFF, etc.)
- **Job name** field (defaults to today's date)
- **Brand selector** — picks from brands in Settings
- **Shoot Type toggle** — On-Model or Still Life. Stored in session as `shootType`.
  - On-Model: standard clothing workflow
  - Still Life: accessories workflow, AI detects category per cluster, clusters labelled "Product N"
- **Images per look** — number input, how many images = one cluster (default: 4)
- **Style list import** — optional XLSX/CSV file with SKU codes. Supports files where headers are not on row 1 (auto-detects header row). Expected columns: Style Code, Style Name, Colour.
- **Processing** — clicking Process runs `processFiles()` and navigates to `/dashboard/review`

---

## 10. Review Page

**File:** `src/app/dashboard/review/page.tsx`

**Important:** This page uses `useSearchParams()` and must be wrapped in a `<Suspense>` boundary. The default export is `ReviewPageWrapper` which wraps the actual `ReviewPage` component.

Key features:

### Naming Format Bar
- Shown at top of page
- Preset pills: SKU Only, Brand+SKU, Full (Brand+SKU+Color+View)
- Custom token buttons: `{BRAND}` `{SKU}` `{COLOR}` `{VIEW}` `{INDEX}` `{SEQ}`
- Live preview shows a sample filename using the active brand + first cluster data
- Applies only to marketplaces where `naming_locked: false` (currently only Shopify)
- Locked marketplaces (THE ICONIC, Myer, David Jones) show their fixed format as read-only info

### Cluster Cards
- Each cluster shows its images in a grid with angle pills
- Expandable to show controls: SKU input, colour, category (still-life), confirm button
- SKU input becomes a searchable dropdown when a style list has been imported
- Still-life clusters show a category dropdown (Bags, Shoes, etc.)
- Missing shot warnings shown per cluster — **suppressed entirely for still-life shoot type**

### Export Panel
- Opens via sidebar Export link (`?export=1` in URL) or within the page
- Marketplace checkboxes
- Triggers client-side export on confirmation

### GM Position Logic
During export, if a cluster contains a `ghost-mannequin` image:
- `brand.gm_position === 'first'` → ghost mannequin image is sorted to index 0
- `brand.gm_position === 'last'` → ghost mannequin image is sorted to end
- `null` → no reordering

### Image Processing Quality
All canvas operations use `imageSmoothingQuality = 'high'`. Large images are downscaled in multiple steps (halving) before reaching target size to prevent quality loss.

### Export Performance
- Images are processed in parallel batches of 6 (`Promise.all` over chunks)
- JSZip uses DEFLATE compression level 1 (fastest, minimal size difference for JPEGs)

---

## 11. Export Logic

**Within:** `src/app/dashboard/review/page.tsx` (the `handleExport` function)

For each confirmed cluster × each selected marketplace:

1. **Determine naming template:**
   ```
   if (rule.naming_locked)
     use rule.naming_template  // retailer-mandated, cannot be changed
   else
     use custom template → brand template → rule template → fallback
   ```

2. **For each image in the cluster:**
   - Resolve view label display name (using accessory category's `angleDisplayNames` if set)
   - Apply naming template with tokens: BRAND, SKU, COLOR, VIEW, INDEX, SEQ
   - Load image into canvas
   - Multi-step downscale to marketplace dimensions
   - Export as JPEG at marketplace quality setting

3. **GM position sort** (if applicable — see above)

4. **Pack all images into a ZIP** file named `{jobName}_{marketplace}.zip`

5. **Trigger browser download**

---

## 12. Marketplace Rules

**File:** `src/lib/marketplace/rules.ts`

| Marketplace | Dimensions | Quality | Required Views | Naming Locked? |
|-------------|------------|---------|----------------|----------------|
| THE ICONIC | 1600×2000 | 100% | front, back | Yes |
| Myer | 1551×2000 | 100% | front, back, detail | Yes |
| David Jones | 1600×2000 | 100% | front, back, side | Yes |
| Shopify | 2369×2953 | 100% | front | No |

**`naming_locked: true`** means the marketplace mandates a specific filename format. The user cannot override it via the naming bar. These formats are:
- THE ICONIC: `{BRAND}_{SKU}_{COLOR}_{VIEW}`
- Myer: `{SKU}_{VIEW}_{INDEX}`
- David Jones: `{BRAND}_{SKU}_{VIEW}`

**`naming_locked: false`** (Shopify) means the user's custom naming template applies.

**Required views** are only enforced for **on-model** shoots. For still-life, `getMissingViewsForCluster` returns `[]` (no warnings).

---

## 13. Image Naming System

**Available tokens:**

| Token | Description | Example |
|-------|-------------|---------|
| `{BRAND}` | Brand code from brand settings | `SL` |
| `{SKU}` | Assigned SKU code | `ABC123` |
| `{COLOR}` | Detected or assigned colour | `BLACK` |
| `{VIEW}` | Shot angle label | `FRONT` |
| `{INDEX}` | Image index within cluster (2-digit) | `01` |
| `{SEQ}` | Cluster sequence number (3-digit) | `003` |

**Rules:**
- All tokens are uppercased in output
- Spaces in BRAND/COLOR are replaced with hyphens
- VIEW hyphens become underscores (e.g. `FULL-LENGTH` → `FULL_LENGTH`)
- If SKU is empty, `{SKU}` falls back to the `{SEQ}` value

**Naming template function:** `src/lib/brands/index.ts → applyNamingTemplate()`

---

## 14. Shoot Types

**`shootType`** is stored in the session (`src/store/session.ts`) and set on the upload page.

### On-Model (`'on-model'`)
- Clusters labelled "Look 1", "Look 2", etc.
- Standard angle sequence: full-length → front → side → mood → detail → back
- Marketplace required-shot warnings are active
- Ghost mannequin / flat-lay images may appear within on-model shoots

### Still Life (`'still-life'`)
- Clusters labelled "Product 1", "Product 2", etc.
- AI detects accessory category per cluster (bags, shoes, etc.)
- Category determines expected angle sequence
- **No marketplace required-shot warnings** (different shot requirements per category)
- User can override category per cluster via dropdown

---

## 15. Accessory Categories

**File:** `src/lib/accessories/categories.ts`

| ID | Label | Angles | Default Count |
|----|-------|--------|---------------|
| `bags` | Bags & Handbags | front, side, detail, back, inside | 5 |
| `shoes` | Shoes & Footwear | front, side, back, detail, top-down | 5 |
| `ties` | Ties & Neckwear | front, detail, back | 3 |
| `caps` | Caps & Hats | front-3/4, back-3/4 | 2 |
| `jewellery` | Jewellery | front (Shot 1), back (Shot 2) | 2 |
| `scarves` | Scarves | top-down, detail (Fabric Detail) | 2 |
| `belts` | Belts | front (Front Full), detail (Buckle Detail) | 2 |
| `socks` | Socks & Hosiery | top-down (Top-down Full), detail | 2 |
| `sunglasses` | Sunglasses & Eyewear | front, side, front-3/4, top-down, detail, back | 6 |

Some categories have `angleDisplayNames` which override the angle label in the UI (e.g. Jewellery shows "Shot 1" instead of "Front").

---

## 16. View / Angle Labels

**Full list** (from `src/types/index.ts`):

```typescript
type ViewLabel =
  | 'front'           // Model facing camera / product facing forward
  | 'back'            // Rear view
  | 'side'            // Profile or three-quarter view
  | 'detail'          // Close-up of fabric, hardware, texture
  | 'mood'            // Lifestyle / editorial shot
  | 'full-length'     // Full body standing shot
  | 'ghost-mannequin' // Garment on invisible mannequin
  | 'flat-lay'        // Product laid flat, photographed from above
  | 'top-down'        // Overhead/aerial view (accessories)
  | 'inside'          // Interior of bag/product
  | 'front-3/4'       // Front three-quarter angle
  | 'back-3/4'        // Back three-quarter angle
  | 'unknown'
```

**Filename keyword detection** (`src/lib/processor/index.ts`):

The processor detects angles from filename tokens (split on `-_. `). Examples:
- `ghost`, `gm`, `mannequin` → `ghost-mannequin`
- `flatlay`, `flat-lay`, `lay` → `flat-lay`
- `topdown`, `overhead`, `aerial` → `top-down`
- `inside`, `interior`, `lining` → `inside`
- `front34`, `3q`, `threequarter` → `front-3/4`
- `back34`, `rearquarter` → `back-3/4`
- `full`, `fl`, `standing` → `full-length`
- `front`, `f`, `hero`, `main` → `front`
- `back`, `b`, `rear` → `back`
- `side`, `s`, `profile` → `side`
- `detail`, `d`, `zoom`, `close` → `detail`
- `mood`, `lifestyle`, `editorial` → `mood`

If no keyword matches, the angle is assigned positionally based on the image's position within the look chunk.

---

## 17. AI Detection (GPT-4o-mini)

**File:** `src/app/api/ai/detect/route.ts`

**How to enable:**
1. Set `OPENAI_API_KEY` in environment variables
2. Set `NEXT_PUBLIC_AI_DETECTION=true`

**What it does:**
- Receives all images from one cluster as base64 JPEG (low detail, to minimise tokens)
- Sends them to GPT-4o-mini with a structured prompt
- Returns:
  - `angles` — per-image angle classification
  - `colour` — a fashion-appropriate colour name (1–3 words, e.g. "dusty rose", "cobalt blue")
  - `category` — accessory category (still-life only): bags, shoes, ties, caps, jewellery, scarves, belts, socks, sunglasses

**Prompt structure:**
- Task 1: Classify each image angle (different options for on-model vs still-life)
- Task 2: Identify primary product colour
- Task 3 (still-life only): Identify product category

**Fallback:** If AI is disabled or fails, the processor falls back to:
1. Colour from filename tokens
2. Colour from canvas pixel sampling (samples centre 60% of image, skips near-white pixels)

**Cost:** GPT-4o-mini with `detail: 'low'` is very cheap per image. A 500-image job uses roughly 100–125 API calls (one per cluster).

---

## 18. Brand Settings

**File:** `src/lib/brands/index.ts`  
**UI:** `src/app/dashboard/settings/page.tsx`

A Brand represents a client whose images are being processed. Multiple brands can exist per organisation.

**Brand fields:**

| Field | Description |
|-------|-------------|
| `name` | Display name (e.g. "Studio Label") |
| `brand_code` | Short code used in filenames (e.g. "SL") |
| `images_per_look` | Default images per cluster for this brand |
| `naming_template` | Default naming template tokens string |
| `gm_position` | `'first'` or `'last'` — where ghost mannequin image goes in export order |
| `shopify_store_url` | Optional Shopify store domain |
| `shopify_access_token` | Optional Shopify Admin API token |
| `logo_color` | Hex colour for brand avatar in UI |

**Demo brands** are shown when Supabase is not connected (no login required to explore the UI).

---

## 19. Style List Import (CSV/XLSX)

**Where:** Upload page, optional "Import Style List" section.

**Purpose:** Pre-load the SKU list for a shoot so that SKU assignment on the review page becomes a searchable dropdown instead of a free-text field.

**Format supported:**
- `.xlsx`, `.xls`, `.csv`
- The importer auto-detects the header row (searches rows 1–10 for a row containing "style code" or "sku")
- Required columns (case-insensitive): **Style Code** (or SKU), **Style Name**, **Colour** (or Color)
- Extra columns are ignored
- Same SKU appearing multiple times (different colours) is fine — each row becomes one entry

**Real-world example:** Brand range lists often have headers on row 4, with branding/season info in rows 1–3. The auto-detection handles this.

**In the session:** Stored as `styleList: StyleListEntry[]`:
```typescript
interface StyleListEntry {
  sku: string
  productName: string
  colour: string
}
```

On the review page, when a style list is loaded, the SKU field on each cluster card becomes a combobox that filters the list in real time.

---

## 20. Billing & Plans (Stripe)

**File:** `src/lib/plans/index.ts`

| Plan | Price | Images/Job | Marketplaces | Exports/Month | Brands | Seats |
|------|-------|-----------|-------------|--------------|--------|-------|
| Free | $0 | 50 | 1 | 3 | 1 | 2 |
| Pro | $29/mo | 500 | 4 | Unlimited | 5 | 5 |
| Business | $99/mo | Unlimited | 4 | Unlimited | Unlimited | Unlimited |

**Implementation:**
- `PlanContext` (`src/context/PlanContext.tsx`) fetches the user's current plan from Supabase and exposes it globally
- `UpgradeModal` component is shown when a user hits a plan limit
- Stripe Checkout creates a subscription
- Stripe Webhook (`/api/billing/webhook`) updates the user's plan in Supabase on subscription changes
- Customer Portal allows plan changes and cancellation

---

## 21. Authentication & Organisations

**Auth:** Supabase Auth (email/password). Middleware at `src/middleware.ts` redirects unauthenticated users to `/login`.

**Organisations:** Multi-tenant. Each user belongs to one organisation (`org_id`). Brands, jobs, and data are scoped to the organisation. Team invite flow:
- Owner sends invite via `/api/orgs/invite` → generates a token
- Invitee visits `/invite/[token]` → accepts and joins org
- Members listed at `/api/orgs/members`

**API Route Auth Pattern:**
All API routes authenticate using a Bearer token pattern to avoid Supabase server-side session issues:
```typescript
const auth = req.headers.get('authorization')
const token = auth?.replace('Bearer ', '')
const { data: { user } } = await supabase.auth.getUser(token)
```
The client sends the session token in the Authorization header. Do NOT use `supabase.auth.getUser()` without a token in server routes — it fails with "Auth session missing!".

---

## 22. Database Schema

**File:** `src/lib/supabase/schema.sql` — run this once in the Supabase SQL editor to set up the database.

**Tables:**

| Table | Purpose |
|-------|---------|
| `jobs` | One row per upload session. Tracks status and pipeline step. |
| `images` | One row per uploaded image. Has embedding vector, view label, cluster assignment. |
| `clusters` | One row per product cluster. Has SKU, colour, missing views. |
| `skus` | Cache of Shopify products for SKU matching. |
| `exports` | Records of generated exports with download URLs. |

**Note:** The `images` table `view_label` CHECK constraint in the SQL file only includes the original 4 labels. If you re-run the schema, update this constraint to include all 13 view labels. The in-memory session store (Zustand) is not constrained by this.

**Brands table** is not in `schema.sql` — it was added separately in Supabase. Schema:
```sql
create table brands (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null,
  name text not null,
  brand_code text not null,
  shopify_store_url text,
  shopify_access_token text,
  logo_color text not null default '#e8d97a',
  images_per_look int not null default 4,
  naming_template text not null default '{BRAND}_{SEQ}_{VIEW}',
  gm_position text check (gm_position in ('first', 'last')),
  created_at timestamptz not null default now()
);
alter table brands enable row level security;
create policy "Users can manage own brands"
  on brands for all using (
    exists (select 1 from orgs_members where org_id = brands.org_id and user_id = auth.uid())
  );
```

---

## 23. API Routes

All routes are in `src/app/api/`. All authenticated routes expect `Authorization: Bearer <token>`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/detect` | POST | AI angle/colour/category detection via GPT-4o-mini |
| `/api/billing/checkout` | POST | Create Stripe Checkout session |
| `/api/billing/portal` | POST | Create Stripe Customer Portal session |
| `/api/billing/plan` | GET | Get current user plan |
| `/api/billing/webhook` | POST | Stripe webhook (no auth — uses Stripe signature) |
| `/api/brands` | GET, POST | List / create brands |
| `/api/brands/[brandId]` | PUT, DELETE | Update / delete a brand |
| `/api/clusters/[clusterId]` | PATCH | Update cluster (SKU, status, etc.) |
| `/api/export` | POST | Trigger server-side export (legacy) |
| `/api/export/zip` | POST | Generate ZIP (legacy) |
| `/api/jobs` | GET, POST | List / create jobs |
| `/api/jobs/[jobId]` | GET, PATCH | Get / update job |
| `/api/jobs/[jobId]/process` | POST | Run server-side pipeline (legacy) |
| `/api/jobs/history` | GET | Job history list |
| `/api/jobs/history/[jobId]` | GET | Single job history |
| `/api/orgs/me` | GET | Get current org |
| `/api/orgs/invite` | POST | Send team invite |
| `/api/orgs/invite/accept` | POST | Accept team invite |
| `/api/orgs/members` | GET | List org members |
| `/api/shopify/products` | GET | Fetch Shopify product catalogue |
| `/api/shopify/upload` | POST | Upload exported images to Shopify (future) |
| `/api/upload` | POST | Handle image file uploads to Supabase Storage |

---

## 24. Pipeline Architecture (Legacy)

`src/lib/pipeline/` contains a 10-step server-side pipeline. This was the original architecture — images were uploaded to Supabase, processed server-side, and stored back.

**Current state:** The app now processes images entirely client-side (in the browser) using `src/lib/processor/index.ts`. The server-side pipeline files are kept but are not the active path for normal use.

**Why client-side?** Faster (no round-trips), works without Supabase configured, no file size concerns, simpler for the current use case.

**If you want to re-enable server-side processing:**
- The upload page would need to call `/api/upload` to store images
- Then call `/api/jobs/[jobId]/process` to run the pipeline steps
- The pipeline steps are each independently replaceable (each is one file)

---

## 25. Deployment

### First-time setup

1. **GitHub:** Push code to a GitHub repository.

2. **Supabase:**
   - Create a new project at supabase.com
   - In SQL Editor, run the contents of `src/lib/supabase/schema.sql`
   - Create two storage buckets: `shoots` and `exports` (both private)
   - Get your project URL, anon key, and service role key from Project Settings → API

3. **Vercel:**
   - Connect Vercel to your GitHub repo
   - Add all environment variables (see Section 4)
   - Deploy

4. **OpenAI (optional):**
   - Create an account at platform.openai.com
   - Generate an API key
   - Add as `OPENAI_API_KEY` in Vercel environment variables
   - Set `NEXT_PUBLIC_AI_DETECTION=true`

5. **Stripe (optional):**
   - Create products + prices in Stripe Dashboard
   - Copy price IDs to Vercel environment variables
   - Set up webhook endpoint: `https://your-domain.vercel.app/api/billing/webhook`
   - Add `STRIPE_WEBHOOK_SECRET` to Vercel

### Ongoing deployments

Every `git push` to `main` triggers an automatic Vercel deployment. No manual steps required.

### Local development

```bash
git clone <repo-url>
cd framesops-ai
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase/OpenAI keys
npm run dev
# Open http://localhost:3000
```

The app works in demo mode (no services required) — it uses mock data so you can explore the UI without any external services configured.

---

## 26. Known Limitations & Future Work

### Current limitations

1. **Client-side processing only for active flow** — the 10-step server-side pipeline exists but is not the active path. For very large batches (1000+ images), browser memory could be a constraint.

2. **No persistent job storage for client-side sessions** — jobs processed client-side are stored in Zustand + sessionStorage. If the user closes the tab, they lose their work. File objects cannot be serialised to sessionStorage.

3. **AI detection requires manual setup** — user must set up their own OpenAI account and API key. No managed AI key.

4. **Database schema partially out of sync** — `images.view_label` CHECK constraint in schema.sql only covers original 4 labels. The `brands` table is not in schema.sql at all.

5. **Shopify upload** — `/api/shopify/upload` endpoint exists but the full direct-to-Shopify upload flow is not wired into the UI.

### High-value future features

1. **Direct marketplace upload API** — partner integrations with THE ICONIC, Myer, David Jones to upload directly via API instead of ZIP download. Requires commercial partnerships.

2. **DAM integration** — connect to Bynder, Brandfolder, or Canto for direct export to the brand's asset library. Wait until you know what DAMs your clients use.

3. **Faster SKU mapping** — bulk import via CSV is built. Future: auto-match clusters to style list by filename (e.g. if filename contains SKU code, auto-assign).

4. **Colour confirmation** — canvas-detected colours are approximate. Could improve by showing a colour swatch on the cluster card and letting user confirm/correct.

5. **Batch history** — the job history pages exist but the UI for browsing past jobs is minimal.

6. **Mobile / tablet support** — currently desktop-only UI.

7. **White label** — resell to photography studios; they brand the app as their own.

---

*End of documentation. Last updated: April 2026.*
