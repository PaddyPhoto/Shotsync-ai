import type { ErpAdapter, ErpProductInput, ErpUpsertResult } from '@/lib/integrations/erp-adapter'

// ── Cin7 OMNI client (distinct from the Cin7 CORE client in ./client.ts) ─────────
// Omni = former Cin7 (api.cin7.com), NOT Core/DEAR. Different auth, different data
// model. Auth: an API-connection username + key sent as HTTP Basic. Data model:
// a Product is the STYLE; a ProductOption is the variant/SKU (productOptionCode).
//
// SCAFFOLDING — built from the PUBLIC docs (api.cin7.com/api/Help). Three things are
// UNVERIFIED and must be confirmed against a live Omni account before this goes live
// (see docs/cin7-omni-integration-plan.md):
//   1. Image submit format — GET returns images[] with a `link` URL, so we POST/PUT
//      the same `{ link }` shape. Whether writes accept a URL (vs base64) is the key
//      open question. Images are also capped at 3MB — callers must pass a <=3MB variant.
//   2. The `where=` query syntax used by findBySku (Omni's filter DSL).
//   3. Whether a single POST /Products can carry its ProductOption + images together.
// testConnection() is safe to run today; the write paths are wired but unproven.

const OMNI_BASE = 'https://api.cin7.com/api/v1'
const DESCRIPTION_MAX = 250 // Omni Product.Description hard cap — see plan doc.

interface OmniImage { link: string }
interface OmniProductDetail {
  id: number
  name?: string
  description?: string
  styleCode?: string
  images?: OmniImage[]
}

export class Cin7OmniClient implements ErpAdapter {
  readonly name = 'cin7-omni'
  private authHeader: string

  constructor(username: string, apiKey: string) {
    // HTTP Basic — username:key. Node runtime (these routes set maxDuration), so
    // Buffer is available; avoids btoa's non-ASCII pitfalls.
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64')
  }

  private headers(): Record<string, string> {
    return { Authorization: this.authHeader, 'Content-Type': 'application/json' }
  }

  // One cheap authed GET to validate credentials. Verified-safe to call today.
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${OMNI_BASE}/Products?page=1&rows=1`, {
        method: 'GET', headers: this.headers(),
      })
      if (res.ok) return { ok: true }
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Cin7 Omni ${res.status}${text ? `: ${text.slice(0, 140)}` : ''}` }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' }
    }
  }

  // Find an existing STYLE by its variant SKU (productOptionCode lives on the option).
  // UNVERIFIED: the exact `where` clause + which endpoint returns the parent productId.
  private async findProductIdBySku(sku: string): Promise<number | null> {
    const q = encodeURIComponent(`code='${sku.replace(/'/g, "''")}'`)
    const res = await fetch(`${OMNI_BASE}/ProductOptions?where=${q}&rows=1`, {
      method: 'GET', headers: this.headers(),
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const opt = Array.isArray(json) ? json[0] : (json?.[0] ?? null)
    const productId = opt?.productId ?? opt?.ProductId
    return typeof productId === 'number' ? productId : null
  }

  private async getProductDetail(id: number): Promise<OmniProductDetail | null> {
    const res = await fetch(`${OMNI_BASE}/Products/${id}`, { method: 'GET', headers: this.headers() })
    if (!res.ok) return null
    const p = await res.json().catch(() => null)
    if (!p?.id && !p?.Id) return null
    return {
      id: p.id ?? p.Id,
      name: p.name ?? p.Name,
      description: p.description ?? p.Description,
      styleCode: p.styleCode ?? p.StyleCode,
      images: Array.isArray(p.images ?? p.Images) ? (p.images ?? p.Images) : [],
    }
  }

  // Upsert: enrich the style if the SKU already exists, else create it. Non-destructive
  // (fills only empty text, appends images deduped by URL). Text is truncated to Omni's
  // 250-char Description cap — the full marketing copy has no home in Omni (plan doc).
  async upsertProduct(input: ErpProductInput): Promise<ErpUpsertResult> {
    try {
      const description = (input.description ?? '').slice(0, DESCRIPTION_MAX)
      const newImages: OmniImage[] = input.images.map((i) => ({ link: i.url }))

      const existingId = await this.findProductIdBySku(input.sku)

      if (existingId) {
        const existing = await this.getProductDetail(existingId)
        if (!existing) {
          return { sku: input.sku, status: 'error', message: 'Could not read existing product to enrich safely' }
        }
        const have = new Set((existing.images ?? []).map((i) => i.link))
        const mergedImages = [...(existing.images ?? []), ...newImages.filter((i) => !have.has(i.link))]

        const body: Record<string, unknown> = { Id: existingId, Images: mergedImages }
        if (!existing.name && input.name) body.Name = input.name.slice(0, 250)
        if (!existing.description && description) body.Description = description
        // PUT accepts a collection; null fields are left untouched (Omni semantics).
        const res = await fetch(`${OMNI_BASE}/Products`, {
          method: 'PUT', headers: this.headers(), body: JSON.stringify([body]),
        })
        if (!res.ok) throw new Error(`Cin7 Omni ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
        return { sku: input.sku, status: 'updated', externalId: String(existingId) }
      }

      // Create: Product (style) + its single ProductOption (the SKU) + images.
      const body = {
        Name: input.name.slice(0, 250),
        Status: 'Public',
        Description: description,
        StyleCode: input.sku,
        Brand: input.brand ?? '',
        OptionLabel1: input.attributes?.Colour ? 'Colour' : undefined,
        Images: newImages,
        ProductOptions: [{ productOptionCode: input.sku, retailPrice: input.price ?? 0 }],
      }
      const res = await fetch(`${OMNI_BASE}/Products`, {
        method: 'POST', headers: this.headers(), body: JSON.stringify([body]),
      })
      if (!res.ok) throw new Error(`Cin7 Omni ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
      const json = await res.json().catch(() => null)
      const created = Array.isArray(json) ? json[0] : json
      const id = created?.id ?? created?.Id
      return { sku: input.sku, status: 'created', externalId: id ? String(id) : undefined }
    } catch (e) {
      return { sku: input.sku, status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }
    }
  }
}
