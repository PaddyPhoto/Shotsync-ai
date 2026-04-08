# ShotSync.ai

Fashion eCommerce post-production automation — upload a product shoot folder, group images into looks, detect shot angles, rename per marketplace requirements, and export market-ready ZIP files.

## Full Documentation

See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for the complete developer reference including:
- Architecture and tech stack
- All environment variables
- File structure and what each file does
- User workflow end-to-end
- Marketplace rules and naming system
- Shoot types (on-model, still-life, ghost mannequin)
- Accessory categories and angle sequences
- AI detection setup (GPT-4o-mini)
- Database schema
- Deployment guide
- Known limitations and future work

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Fill in your Supabase, OpenAI, Stripe, and Shopify keys (all optional except Supabase for production use — the app runs in demo mode without them).

### 3. Database setup

In the Supabase SQL editor, run the full contents of:
```
src/lib/supabase/schema.sql
```

Then create two private storage buckets named `shoots` and `exports`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — PostgreSQL, Auth, Storage
- **OpenAI GPT-4o-mini** — angle, colour, and category detection
- **Zustand** — client-side session state
- **JSZip** — ZIP export
- **Stripe** — subscription billing
- **Vercel** — deployment

## Deployment

Connect this GitHub repository to Vercel. Add environment variables in Vercel project settings. Every push to `main` deploys automatically.

See [DOCUMENTATION.md](./DOCUMENTATION.md) for full deployment instructions.
