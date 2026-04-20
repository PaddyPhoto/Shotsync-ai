# ShotSync.ai — Developer Handover Document

**Product:** ShotSync.ai — Fashion eCommerce post-production automation SaaS
**Repo folder:** `framesops-ai` (legacy working name)
**Live deployment:** Vercel, auto-deploys on push to `main`
**Owner:** photoworkssydney@gmail.com

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 14.2.5 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3.4.1 |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) | 2.43.4 |
| AI | OpenAI GPT-4o / GPT-4o-mini / text-embedding-3-small | 4.52.7 |
| Billing | Stripe | 21.0.1 |
| Email | Resend (hello@shotsync.ai) | 6.10.0 |
| Image processing | Sharp | 0.33.4 |
| ZIP exports | JSZip | 3.10.1 |
| Animations | Framer Motion | 11.3.19 |
| State | Zustand + TanStack React Query | 4.5.4 / 5.51.21 |
| Monitoring | Sentry | 10.49.0 |
| Clustering (ML) | ml-kmeans + ml-distance | 3.0.0 / 4.0.1 |

---

## 2. Project Structure

```
/src/
├── app/
│   ├── api/                      # All API routes (see Section 4)
│   ├── dashboard/                # Authenticated app pages
│   │   ├── page.tsx              # Dashboard home (recent jobs)
│   │   ├── upload/               # Upload page
│   │   ├── review/               # Cluster confirmation
│   │   ├── jobs/                 # Job list + detail pages
│   │   └── settings/             # Billing + account settings
│   ├── (auth)/                   # Login / signup pages
│   ├── auth/                     # Supabase OAuth callback handler
│   ├── invite/                   # Org invite acceptance
│   ├── enter/                    # Password gate page
│   ├── faq/ privacy/ terms/      # Static content pages
│   ├── page.tsx                  # Landing page (hero + pricing + Watch Demo)
│   └── globals.css
├── components/
│   ├── billing/                  # UpgradeModal, UsageBar
│   ├── clusters/                 # ClusterCard, ClusterGrid
│   ├── layout/                   # Sidebar, Topbar, BrandSwitcher
│   ├── onboarding/               # BrandOnboardingModal, WelcomeModal
│   ├── processing/               # PipelineSteps
│   ├── upload/                   # DropZone, FileList
│   ├── validation/               # ValidationPanel
│   ├── export/                   # MarketplaceSelector
│   ├── download/                 # DownloadCard
│   └── ui/                       # HelpTooltip + shared UI
├── lib/
│   ├── pipeline/                 # 10-step processing pipeline (see Section 6)
│   ├── plans/                    # Pricing tiers + feature gates
│   ├── supabase/                 # Supabase client factories
│   ├── brands/                   # Brand CRUD helpers
│   ├── shopify/                  # Shopify API client
│   ├── cloud/                    # Google Drive + Dropbox helpers
│   ├── marketplace/              # Marketplace rules + formatting
│   ├── naming/                   # File naming convention logic
│   ├── email/                    # Email templates (Resend)
│   ├── rateLimit.ts              # IP-based rate limiter
│   └── utils.ts
├── store/                        # Zustand stores (session, upload)
├── types/index.ts                # All shared TypeScript types
├── context/                      # React Context (Plan, Brand)
└── middleware.ts                 # Auth + password gate
/public/
├── onboarding.html               # Interactive demo tutorial (Watch Demo modal)
├── animations.jsx                # Tutorial animation helpers
└── scenes.jsx                    # Tutorial scene definitions
```

---

## 3. Environment Variables

Copy `.env.example` and fill in all values. Required for production:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only — never expose to client

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=
NEXT_PUBLIC_STRIPE_BRAND_PRICE_ID=
NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=

# Google Drive OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_API_KEY=
GOOGLE_CLIENT_SECRET=

# Dropbox OAuth
NEXT_PUBLIC_DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=

# App
NEXT_PUBLIC_APP_URL=               # e.g. https://shotsync.ai
SITE_PASSWORD=                     # Optional early-access gate
NEXT_PUBLIC_SENTRY_DSN=
```

> AWS S3 credentials are stored **per-brand** in `brands.cloud_connections` (JSONB), not in env vars.

---

## 4. API Routes

### AI
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/embed` | Generate OpenAI embeddings for images |
| POST | `/api/ai/detect` | Angle, colour, category detection (GPT-4o vision) |
| POST | `/api/ai/classify-accessory` | Classify accessory type |

### Auth
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/set-session` | Set Supabase session cookie |
| GET | `/api/enter` | Password gate verification |

### Billing (Stripe)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/billing/checkout` | Create Stripe checkout session |
| GET | `/api/billing/plan` | Get current plan for user's org |
| GET | `/api/billing/portal` | Create Stripe customer portal link |
| POST | `/api/billing/webhook` | Handle Stripe webhook events |

### Brands
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/brands` | List org's brands |
| POST | `/api/brands` | Create brand |
| PATCH | `/api/brands/[brandId]` | Update brand settings / credentials |
| DELETE | `/api/brands/[brandId]` | Delete brand |

### Jobs
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/jobs` | List user's jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/[jobId]` | Get job detail |
| PATCH | `/api/jobs/[jobId]` | Update job |
| DELETE | `/api/jobs/[jobId]` | Delete job |
| POST | `/api/jobs/[jobId]/process` | Trigger pipeline |
| GET | `/api/jobs/history` | Job history list |
| GET/PATCH | `/api/jobs/history/[jobId]` | Specific history record |

### Clusters
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/clusters/[clusterId]` | Cluster detail + images |
| PATCH | `/api/clusters/[clusterId]` | Update SKU / status |

### Export
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/export` | Trigger export (plan limits enforced) |
| POST | `/api/export/zip` | Download ZIP |

### Cloud Integrations
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/integrations/google/callback` | Google OAuth callback |
| GET | `/api/integrations/google/list` | List Google Drive files |
| GET | `/api/integrations/dropbox/callback` | Dropbox OAuth callback |
| GET | `/api/integrations/s3/list` | List S3 bucket |
| POST | `/api/integrations/s3/presign` | Generate presigned S3 URLs |

### Organisation
| Method | Route | Purpose |
|--------|-------|---------|
| GET/PATCH | `/api/orgs/me` | Get / update org |
| GET/POST/PATCH/DELETE | `/api/orgs/members` | Manage members |
| POST | `/api/orgs/invite` | Send invite email |
| GET | `/api/orgs/invite/accept` | Accept invite |

### Other
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/shopify/upload` | Create Shopify draft products |
| POST | `/api/upload` | Upload images (rate limited 30/min) |
| POST | `/api/copy/generate` | AI product copy generation |
| POST | `/api/users/welcome` | Send welcome email on signup |

---

## 5. Database Tables

| Table | Key Columns | Notes |
|-------|------------|-------|
| `auth.users` | `id`, `email` | Supabase managed |
| `profiles` | `id` (= auth.users.id), `email` | 1-to-1 with auth user |
| `orgs` | `id`, `name`, `owner_id`, `plan`, `stripe_customer_id`, `stripe_subscription_status` | Multi-tenant root |
| `org_members` | `org_id`, `user_id`, `role` | Roles: owner / admin / member |
| `org_invites` | `id`, `org_id`, `email`, `token`, `expires_at` | Pending invites |
| `brands` | `id`, `org_id`, `name`, `brand_code`, `shopify_store_url`, `shopify_access_token`, `cloud_connections` (JSONB) | Per-org brands |
| `jobs` | `id`, `user_id`, `brand_id`, `status`, `pipeline_step`, `total_images`, `processed_images`, `cluster_count`, `selected_marketplaces` | Main processing jobs |
| `images` | `id`, `job_id`, `cluster_id`, `storage_path`, `storage_url`, `original_filename`, `renamed_filename`, `embedding_vector`, `view_label`, `view_confidence`, `width`, `height` | Per-image records |
| `clusters` | `id`, `job_id`, `assigned_sku`, `assigned_product_name`, `color`, `brand`, `detected_views`, `missing_views`, `status`, `image_count` | Grouped image sets |
| `exports` | `id`, `job_id`, `cluster_id`, `marketplace`, `output_files` (JSONB), `download_url`, `file_size_bytes`, `status` | Export records |
| `job_history` | `id`, `job_id`, `timestamp`, `step`, `status`, `data` (JSONB) | Timestamped state snapshots |

**Supabase Storage Buckets:**
- `shoots` — Original + processed images
- `exports` — Generated ZIP files

**To delete a user (run in SQL Editor):**
```sql
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'user@example.com';
  DELETE FROM jobs    WHERE user_id = uid;
  DELETE FROM brands  WHERE org_id  = uid;
  DELETE FROM orgs    WHERE owner_id = uid;
  DELETE FROM profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;
```

---

## 6. Processing Pipeline (`src/lib/pipeline/`)

The pipeline is **10 steps, fully modular** — each step can be replaced independently.

| Step | File | What it does |
|------|------|-------------|
| 1 | `step1-store.ts` | Upload images to Supabase Storage (`shoots` bucket) |
| 2 | `step2-embeddings.ts` | Describe images with GPT-4o-mini → embed with text-embedding-3-small (1536-dim) |
| 3 | `step3-clustering.ts` | K-means clustering on embeddings (cosine similarity, K-means++ init) |
| 4 | `step4-clusters.ts` | Create cluster records in DB, link images to clusters |
| 5 | *(review pause)* | User confirms clusters + assigns SKUs in UI |
| 6 | `step6-angle-detection.ts` | GPT-4o vision classifies angle per image (front/back/side/detail etc.) |
| 7 | `step7-missing-shots.ts` | Validates required angles per marketplace, flags missing views |
| 8 | `step8-naming.ts` | Applies naming templates → `images.renamed_filename` |
| 9 | `step9-marketplace-format.ts` | Resizes + crops images to marketplace specs using Sharp |
| 10 | `step10-export.ts` | Builds ZIP per marketplace, uploads to Storage, saves export record |

**Orchestration:**
- `runPipeline()` — Steps 1–4, then pauses for user review
- `runExport()` — Steps 6–10, triggered after user confirms clusters

---

## 7. Billing & Plans (`src/lib/plans/index.ts`)

| Plan | Price (AUD/mo) | Images/mo | Brands | Seats | Shopify | AI Copy |
|------|---------------|-----------|--------|-------|---------|---------|
| Free | $0 | 25 | 1 | 1 | No | No |
| Starter | $79 | 500 | 1 | 2 | 1 store | No |
| Brand | $199 | 1,500 | 3 | 5 | 1 store | Yes |
| Scale | $399 | 5,000 | Unlimited | 10 | 2 stores | Yes |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited | Yes |

**Stripe Webhook Events handled (`/api/billing/webhook`):**
- `checkout.session.completed` — New subscription → update `orgs.plan`
- `customer.subscription.updated` — Plan change
- `customer.subscription.deleted` — Cancellation
- `invoice.payment_failed` — Payment failure

**Rate limits:**
- Upload: 30 requests/min per IP
- Export: 10 requests/min per IP
- Copy: 20 requests/min per IP

---

## 8. Auth Pattern

**Important:** Server-side `getUser()` from Supabase cookies fails with "Auth session missing!" in API routes. Use the custom `getAuthUser(req)` helper instead.

```ts
// src/lib/supabase/server.ts
getAuthUser(req)       // Tries bearer token first, then cookies — use in all API routes
createClient()         // Browser-safe client (reads/writes session cookies)
createServiceClient()  // Service role — bypasses RLS, server-side only
                       // Must pass cache: 'no-store' to avoid Next.js Data Cache stale responses
```

**Middleware (`src/middleware.ts`):**
- Reads `SITE_PASSWORD` env var → enforces cookie gate on all routes
- Recovers Supabase session from cookie (no network call)
- Redirects `/` → `/dashboard` if authenticated
- Redirects `/dashboard/*` → `/login` if unauthenticated

---

## 9. Third-Party Integrations

| Service | Purpose | Credentials |
|---------|---------|-------------|
| **Supabase** | DB, Auth, Storage | `.env` |
| **OpenAI** | Image embeddings + vision detection | `.env` |
| **Stripe** | Subscription billing | `.env` |
| **Resend** | Transactional email | `.env` (sender: hello@shotsync.ai) |
| **Shopify** | Create draft product listings | Per-brand in `brands.shopify_access_token` |
| **Google Drive** | Import images from Drive | OAuth tokens in `brands.cloud_connections.google_drive` |
| **Dropbox** | Import images from Dropbox | OAuth tokens in `brands.cloud_connections.dropbox` |
| **AWS S3** | Import images from S3 | Credentials in `brands.cloud_connections.s3` |
| **Sentry** | Error tracking | `NEXT_PUBLIC_SENTRY_DSN` env var |

---

## 10. Deployment

- **Platform:** Vercel (project: `shotsync-ai`, org: `team_6t13xEoplLJAfEvYDutx8zIJ`)
- **Trigger:** Auto-deploy on push to `main` branch
- **Build:** `next build` / `next start`
- **Repo:** https://github.com/PaddyPhoto/Shotsync-ai

**Vercel function timeouts (set in `next.config.mjs` or `vercel.json`):**
- `/api/export` — 300s (ZIP generation is slow)
- All others — 60s default

**Demo mode:** If `NEXT_PUBLIC_SUPABASE_URL` is a placeholder, the app runs without a real database (mock data returned). Useful for local dev without credentials.

---

## 11. Critical Files for New Developers

| File | Why it matters |
|------|---------------|
| `src/middleware.ts` | Auth gate + session recovery — touch with care |
| `src/lib/pipeline/index.ts` | Main pipeline orchestrator |
| `src/lib/plans/index.ts` | All plan limits + feature gates |
| `src/lib/supabase/server.ts` | Auth client factories — read the auth pattern notes |
| `src/app/api/billing/webhook/route.ts` | Stripe event handler |
| `src/types/index.ts` | All shared TypeScript types |
| `src/app/page.tsx` | Landing page (hero, pricing, Watch Demo modal) |
| `next.config.mjs` | Build config + Sentry |
| `public/onboarding.html` | Interactive demo tutorial |
| `DOCUMENTATION.md` | Extended architecture reference |

---

## 12. Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Run dev server
npm run dev
# → http://localhost:3000

# 4. (Optional) Run without Supabase
# Leave NEXT_PUBLIC_SUPABASE_URL as placeholder — app runs in demo mode
```

---

*Last updated: April 2026*
