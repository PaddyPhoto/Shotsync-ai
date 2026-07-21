// ── ERP destination adapter ──────────────────────────────────────────────────
// A single, destination-neutral shape for "push an enriched product record into a
// system of record". Each ERP (Cin7 Omni, Cin7 Core, Indigo8, NetSuite, AIMS360…)
// implements this once; the export/publish paths call the interface, not the
// vendor. Built at the point we committed to a SECOND ERP (Omni + Indigo8) — two
// examples reveal the right seam that one would have only guessed at.
//
// Deliberately vendor-neutral: images are plain URLs (every ERP we've looked at
// can fetch a hosted image), attributes are a flat map, and the caller doesn't
// know or care whether the adapter creates vs. enriches — that's upsertProduct's
// job. Keep this interface small; push vendor quirks (Omni's 250-char description,
// Core's attribute sets, Indigo8's option model) INTO the adapter, never out here.

export interface ErpImage {
  url: string
  filename: string
  isDefault?: boolean
}

export interface ErpProductInput {
  sku: string
  name: string
  description?: string
  brand?: string
  category?: string
  price?: number
  attributes?: Record<string, string>
  images: ErpImage[]
}

export type ErpUpsertStatus = 'created' | 'updated' | 'error'

export interface ErpUpsertResult {
  sku: string
  status: ErpUpsertStatus
  externalId?: string
  message?: string
}

export interface ErpAdapter {
  /** Short vendor label, e.g. 'cin7-omni'. */
  readonly name: string
  /** Lightweight credential check — one cheap authed GET. */
  testConnection(): Promise<{ ok: boolean; error?: string }>
  /** Enrich the product if its SKU already exists, else create it. Non-destructive. */
  upsertProduct(input: ErpProductInput): Promise<ErpUpsertResult>
}
