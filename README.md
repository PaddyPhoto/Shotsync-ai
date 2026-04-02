# FramesOps.ai

Fashion eCommerce post-production automation — upload product shoot images, AI groups them by SKU, detects angles, renames everything, and exports marketplace-ready sets.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + RLS)
- **Storage**: Supabase Storage (swap for S3 via step1-store.ts)
- **AI**: OpenAI GPT-4o-mini for embeddings + angle detection (falls back to filename heuristics)
- **Image Processing**: Sharp
- **Export**: JSZip

## Quick Start

### 1. Install dependencies

```bash
cd framesops-ai
npm install
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional — falls back to mock embeddings for dev)
- `SHOPIFY_SHOP_DOMAIN` + `SHOPIFY_ACCESS_TOKEN` (optional — uses mock SKUs)

### 3. Database setup

In Supabase SQL editor, run the contents of:
```
src/lib/supabase/schema.sql
```

Create two storage buckets named `shoots` (private) and `exports` (private).

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pipeline Architecture

Each step in `src/lib/pipeline/` is independently replaceable:

| Step | File | Description |
|------|------|-------------|
| 1 | `step1-store.ts` | Upload images to Supabase Storage |
| 2 | `step2-embeddings.ts` | Generate image embeddings (OpenAI or mock) |
| 3 | `step3-clustering.ts` | K-means clustering with cosine similarity |
| 4 | `step4-clusters.ts` | Persist cluster records to DB |
| 5 | `step5-shopify-match.ts` | Match clusters to Shopify SKUs |
| 6 | `step6-angle-detection.ts` | Classify front/back/side/detail |
| 7 | `step7-missing-shots.ts` | Detect missing required shots per marketplace |
| 8 | `step8-naming.ts` | Apply BRAND_SKU_COLOR_VIEW naming |
| 9 | `step9-marketplace-format.ts` | Resize + crop per marketplace spec |
| 10 | `step10-export.ts` | Build ZIP archives |

## Marketplace Rules

Defined in `src/lib/marketplace/rules.ts`:

| Marketplace | Dimensions | Format | Required Shots |
|-------------|------------|--------|----------------|
| THE ICONIC | 800×1100 | JPG/85% | front, back |
| Myer | 1000×1333 | JPG/90% | front, back, detail |
| David Jones | 900×1200 | JPG/88% | front, back, side |
| Shopify | 2048×2048 | JPG/92% | front |

## UI Flow

```
/ (landing)
  └── /dashboard
        ├── /upload              → New batch upload
        └── /jobs/[jobId]        → Processing status (polls every 2s)
              ├── /review        → Cluster review + SKU confirmation
              ├── /validation    → Missing shot warnings
              ├── /export        → Marketplace selection + export trigger
              └── /download      → Download ZIPs
```

## Demo Mode

The app works without Supabase/OpenAI configured — it shows demo data so you can explore the UI. Connect the services to enable real processing.

## Upgrading the AI

To replace mock embeddings with a proper vision model:
1. Edit `src/lib/pipeline/step2-embeddings.ts` — swap `generateMockEmbedding` with CLIP or a visual embeddings API
2. Edit `src/lib/pipeline/step6-angle-detection.ts` — replace `assignSequenceLabels` with a trained classifier
