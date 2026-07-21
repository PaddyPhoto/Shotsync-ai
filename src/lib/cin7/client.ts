const BASE_URL = 'https://inventory.dearsystems.com/ExternalApi/v2'

export interface Cin7ProductRaw {
  ID: string
  SKU: string
  Name: string
  Category: string
  Brand: string
  Price: number
  Attributes: Record<string, string>
}

export interface Cin7Image {
  ImageUrl: string
  Filename: string
  MimeType: string
  IsDefault: boolean
}

export interface Cin7ProductInput {
  sku: string
  name: string
  description?: string
  brand?: string
  category?: string
  price?: number
  attributeSet?: string
  attributes?: Record<string, string>
  images: Cin7Image[]
}

export class Cin7Client {
  private headers: Record<string, string>

  constructor(accountId: string, applicationKey: string) {
    this.headers = {
      'api-auth-accountid': accountId,
      'api-auth-applicationkey': applicationKey,
      'Content-Type': 'application/json',
    }
  }

  async listProducts(): Promise<Cin7ProductRaw[]> {
    const all: Cin7ProductRaw[] = []
    let page = 1
    while (true) {
      const url = `${BASE_URL}/Product?Limit=100&Page=${page}`
      const res = await fetch(url, { method: 'GET', headers: this.headers })
      if (!res.ok) break
      const json = await res.json().catch(() => null)
      const batch: Cin7ProductRaw[] = json?.Products ?? []
      if (!batch.length) break
      all.push(...batch)
      if (batch.length < 100) break
      page++
    }
    return all
  }

  async findProductBySku(sku: string): Promise<{ id: string } | null> {
    const url = `${BASE_URL}/Product?SKU=${encodeURIComponent(sku)}&Limit=5`
    const res = await fetch(url, { method: 'GET', headers: this.headers })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const products: { ID: string; SKU: string }[] = json?.Products ?? []
    const match = products.find((p) => p.SKU === sku)
    return match ? { id: match.ID } : null
  }

  // Full detail for one product — needed so an enrich (updateProduct) can MERGE
  // rather than clobber: we read the brand's current name/description/price/
  // attributes/images and only fill what's empty / append new images.
  // NOTE (unverified): the exact shape of the single-product response and whether
  // it carries `Images` must be confirmed against a live Cin7 Core account. We read
  // defensively (Products[0] or a bare object) and treat a missing Images array as
  // empty. Returns null on any failure so the caller can fail safe.
  async getProductDetail(id: string): Promise<{
    name?: string; description?: string; price?: number
    attributes: Record<string, string>; images: Cin7Image[]
  } | null> {
    const url = `${BASE_URL}/Product?ID=${encodeURIComponent(id)}&Limit=1`
    const res = await fetch(url, { method: 'GET', headers: this.headers })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const p = json?.Products?.[0] ?? (json?.ID ? json : null)
    if (!p) return null
    return {
      name: p.Name,
      description: p.Description,
      price: typeof p.Price === 'number' ? p.Price : undefined,
      attributes: (p.Attributes ?? {}) as Record<string, string>,
      images: Array.isArray(p.Images) ? (p.Images as Cin7Image[]) : [],
    }
  }

  // Enrich an EXISTING product (SKU already in Cin7, e.g. created at PO stage).
  // Non-destructive by design: fills only empty text fields, merges attributes
  // (never overwrites a value the brand already set), and APPENDS images (dedup by
  // Filename), preserving the existing gallery + its default. Fails safe: if the
  // current detail can't be read, we throw instead of risking a destructive PUT.
  async updateProduct(id: string, input: Cin7ProductInput): Promise<void> {
    const existing = await this.getProductDetail(id)
    if (!existing) throw new Error('Could not read existing product to enrich safely')

    const mergedAttributes: Record<string, string> = { ...existing.attributes }
    for (const [k, v] of Object.entries(input.attributes ?? {})) {
      if (!mergedAttributes[k]) mergedAttributes[k] = v // fill-if-empty
    }

    const have = new Set(existing.images.map((i) => i.Filename))
    const appended = input.images
      .filter((i) => !have.has(i.Filename))
      .map((i) => ({ ...i, IsDefault: existing.images.length === 0 && i.IsDefault }))
    const mergedImages = [...existing.images, ...appended]

    const body: Record<string, unknown> = { ID: id, SKU: input.sku, Images: mergedImages }
    if (!existing.name && input.name) body.Name = input.name
    if (!existing.description && input.description) body.Description = input.description
    if ((existing.price ?? 0) === 0 && input.price) body.Price = input.price
    if (Object.keys(mergedAttributes).length) {
      body.AttributeSet = input.attributeSet ?? 'ShotSync Apparel'
      body.Attributes = mergedAttributes
    }

    const res = await fetch(`${BASE_URL}/Product`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let detail = errText.slice(0, 300)
      try {
        const parsed = JSON.parse(errText)
        if (parsed.errors ?? parsed.Error) detail = JSON.stringify(parsed.errors ?? parsed.Error).slice(0, 300)
      } catch { /* keep raw text */ }
      throw new Error(`Cin7 ${res.status}: ${detail}`)
    }
  }

  async createProduct(input: Cin7ProductInput): Promise<{ id: string }> {
    const url = `${BASE_URL}/Product`

    const body = {
      SKU: input.sku,
      Name: input.name || input.sku,
      Description: input.description ?? '',
      Brand: input.brand ?? '',
      Category: input.category ?? '',
      Status: 'Active',
      Type: 'Stock',
      UOM: 'Each',
      CostingMethod: 'FIFO',
      Price: input.price ?? 0,
      AttributeSet: input.attributeSet ?? 'ShotSync Apparel',
      Attributes: input.attributes ?? {},
      Images: input.images,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let detail = errText.slice(0, 300)
      try {
        const parsed = JSON.parse(errText)
        if (parsed.errors ?? parsed.Error) detail = JSON.stringify(parsed.errors ?? parsed.Error).slice(0, 300)
      } catch { /* keep raw text */ }
      throw new Error(`Cin7 ${res.status}: ${detail}`)
    }

    const json = await res.json().catch(() => null)
    const id = json?.ID ?? json?.id
    if (!id) throw new Error('Cin7 returned no product ID')
    return { id: String(id) }
  }
}
