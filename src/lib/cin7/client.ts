const BASE_URL = 'https://inventory.dearsystems.com/ExternalApi/v2'

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

  async findProductBySku(sku: string): Promise<{ id: string } | null> {
    const url = `${BASE_URL}/Product?SKU=${encodeURIComponent(sku)}&Limit=5`
    const res = await fetch(url, { method: 'GET', headers: this.headers })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const products: { ID: string; SKU: string }[] = json?.Products ?? []
    const match = products.find((p) => p.SKU === sku)
    return match ? { id: match.ID } : null
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
