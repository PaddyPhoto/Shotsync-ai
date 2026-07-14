import type { SupabaseClient } from '@supabase/supabase-js'

// ── Tenant-scoped database access ────────────────────────────────────────────
// The API uses the service-role client, which BYPASSES Postgres RLS. That means
// tenant isolation depends entirely on every query filtering by org_id — and a
// single forgotten `.eq('org_id', …)` is a cross-tenant leak (an IDOR).
//
// This helper removes the "remember to add the filter" failure mode: you cannot
// build a query against a tenant table without supplying an org, and the filter
// is applied here, once, correctly — instead of being re-typed at every callsite.
//
// The returned values are ordinary Supabase query builders with the org filter
// already applied, so chain the rest (.eq('id', …), .single(), .order(), …) as
// usual. insert/upsert force org_id onto every row.
//
// NOTE: this is app-level defence. It makes leaks hard to introduce by accident;
// it does not make them impossible the way database RLS would. The CI check in
// scripts/check-tenant-scoping.mjs flags any raw `.from('<tenant table>')` that
// bypasses this helper so a reviewer sees it.

// Tables that carry an org_id column and must always be org-scoped.
// (orgs / org_members are the identity tables you query BY user_id to resolve
// the caller's org, so they are intentionally not covered here.)
export const TENANT_TABLES = [
  'brands',
  'products',
  'job_history',
  'shoots',
  'job_clusters',
  'activity_log',
  'org_invites',
  'marketplace_rules',
] as const

export type TenantTable = (typeof TENANT_TABLES)[number]

type Row = Record<string, unknown>

function withOrg(values: Row | Row[], orgId: string): Row | Row[] {
  return Array.isArray(values)
    ? values.map((v) => ({ ...v, org_id: orgId }))
    : { ...values, org_id: orgId }
}

export function tenantDb(service: SupabaseClient, orgId: string) {
  if (!orgId) throw new Error('tenantDb: orgId is required')

  return {
    /** SELECT scoped to the org. Chain further filters as normal. */
    select(table: TenantTable, columns = '*') {
      return service.from(table).select(columns).eq('org_id', orgId)
    },
    /** SELECT with an exact head count, scoped to the org. */
    count(table: TenantTable) {
      return service.from(table).select('*', { count: 'exact', head: true }).eq('org_id', orgId)
    },
    /** INSERT with org_id forced onto every row. */
    insert(table: TenantTable, values: Row | Row[]) {
      return service.from(table).insert(withOrg(values, orgId))
    },
    /** UPSERT with org_id forced onto every row. */
    upsert(
      table: TenantTable,
      values: Row | Row[],
      options?: { onConflict?: string },
    ) {
      return service.from(table).upsert(withOrg(values, orgId), options)
    },
    /** UPDATE scoped to the org. Chain .eq('id', …) to target a row. */
    update(table: TenantTable, values: Row) {
      return service.from(table).update(values).eq('org_id', orgId)
    },
    /** DELETE scoped to the org. Chain .eq('id', …) to target a row. */
    delete(table: TenantTable) {
      return service.from(table).delete().eq('org_id', orgId)
    },
  }
}

export type TenantDb = ReturnType<typeof tenantDb>
