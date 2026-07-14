#!/usr/bin/env node
// ── Tenant-scoping guard (ratchet) ───────────────────────────────────────────
// Fails CI when NEW code accesses an org-scoped table via a raw `.from('<table>')`
// instead of the tenantDb() helper (src/lib/supabase/tenant.ts), because the raw
// path can silently forget the `.eq('org_id', …)` filter — a cross-tenant leak.
//
// It is a ratchet: the existing (audited-clean) call sites are recorded in
// scripts/tenant-scoping-baseline.json and allowed; anything NOT in the baseline
// is a new violation. When you intentionally add/change tenant access (after
// review), regenerate the baseline with:  node scripts/check-tenant-scoping.mjs --update
//
// Keep TENANT_TABLES in sync with src/lib/supabase/tenant.ts.

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const SRC = join(ROOT, 'src')
const BASELINE = join(ROOT, 'scripts', 'tenant-scoping-baseline.json')
const HELPER = 'src/lib/supabase/tenant.ts' // the one file allowed to call .from() on these

const TENANT_TABLES = [
  'brands', 'products', 'job_history', 'shoots',
  'job_clusters', 'activity_log', 'org_invites', 'marketplace_rules',
]
const RE = new RegExp(`\\.from\\(\\s*['"\`](${TENANT_TABLES.join('|')})['"\`]\\s*\\)`, 'g')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

// Collect findings keyed by `relpath :: trimmed source line` (stable vs line shifts).
function collect() {
  const found = new Set()
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split('\\').join('/')
    if (rel === HELPER) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      RE.lastIndex = 0
      if (RE.test(line)) found.add(`${rel} :: ${line.trim()}`)
    }
  }
  return found
}

const findings = collect()
const update = process.argv.includes('--update')

if (update) {
  writeFileSync(BASELINE, JSON.stringify([...findings].sort(), null, 2) + '\n')
  console.log(`Baseline updated: ${findings.size} allowed tenant-table call site(s) recorded.`)
  process.exit(0)
}

const baseline = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : [])
const violations = [...findings].filter((f) => !baseline.has(f)).sort()

if (violations.length === 0) {
  console.log(`✓ tenant-scoping: no new raw access to org-scoped tables (${findings.size} baselined).`)
  process.exit(0)
}

console.error(`\n✗ tenant-scoping: ${violations.length} new raw access(es) to an org-scoped table.\n`)
console.error('These tables carry org_id and MUST be scoped to the caller. Use the tenantDb()')
console.error('helper (src/lib/supabase/tenant.ts) instead of a raw service.from(...):\n')
for (const v of violations) console.error(`  • ${v}`)
console.error('\nIf this access is deliberate and correctly scoped, re-baseline after review:')
console.error('  node scripts/check-tenant-scoping.mjs --update\n')
process.exit(1)
