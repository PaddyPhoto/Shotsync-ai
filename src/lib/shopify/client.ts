export interface ShopifyMetafield {
  namespace: string
  key: string
  value: string
  type: 'single_line_text_field' | 'number_decimal'
}

export class ShopifyClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(shopDomain: string, accessToken: string) {
    // Normalise: strip protocol, trailing slashes/spaces, and any /admin path the user may have pasted
    const cleanDomain = shopDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/admin.*$/i, '')
      .replace(/\/+$/, '')
    this.baseUrl = `https://${cleanDomain}/admin/api/2025-01`
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Find an existing product by exact SKU match using the GraphQL API.
   * Returns the product's numeric ID and admin URL, or null if not found.
   */
  async findProductBySku(sku: string): Promise<{ id: string; adminUrl: string } | null> {
    const url = `${this.baseUrl}/graphql.json`
    // Escape single quotes in SKU for the GQL query string
    const safeSku = sku.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const query = `{
      productVariants(first: 10, query: "sku:'${safeSku}'") {
        edges {
          node {
            sku
            product { legacyResourceId status }
          }
        }
      }
    }`

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query }),
    })
    if (!res.ok) return null

    const json = await res.json().catch(() => null)
    const edges: { node: { sku: string; product: { legacyResourceId: string; status: string } } }[] =
      json?.data?.productVariants?.edges ?? []

    // GraphQL query is a contains search — filter for exact match
    const match = edges.find((e) => e.node.sku === sku)
    if (!match) return null

    const productId = match.node.product.legacyResourceId
    const shopDomain = this.baseUrl.split('/admin/')[0].replace('https://', '')
    return { id: String(productId), adminUrl: `https://${shopDomain}/admin/products/${productId}` }
  }

  /**
   * Append images to an existing product — one REST call per image.
   * Existing images are untouched.
   */
  async appendImages(
    productId: string,
    images: { src?: string; base64?: string; filename: string }[],
  ): Promise<void> {
    const url = `${this.baseUrl}/products/${productId}/images.json`
    for (const img of images) {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          image: {
            ...(img.base64 ? { attachment: img.base64 } : { src: img.src }),
            filename: img.filename,
          },
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`Shopify image append ${res.status}: ${errText.slice(0, 200)}`)
      }
    }
  }

  /**
   * Create a new Shopify product as a draft with full enrichment:
   * price, product_type, metafields, and images in one API call.
   */
  async createProduct(opts: {
    title: string
    sku: string
    vendor?: string
    color?: string
    bodyHtml?: string
    price?: number
    productType?: string
    metafields?: ShopifyMetafield[]
    images: { src?: string; base64?: string; filename: string }[]
  }): Promise<{ id: string; adminUrl: string } | null> {
    const url = `${this.baseUrl}/products.json`

    const options = opts.color ? [{ name: 'Color', values: [opts.color] }] : []
    const variant: Record<string, unknown> = {
      sku: opts.sku,
      price: opts.price ? String(opts.price.toFixed(2)) : '0.00',
      inventory_management: null,
    }
    if (opts.color) variant.option1 = opts.color

    const body = {
      product: {
        title: opts.title || opts.sku,
        body_html: opts.bodyHtml ?? '',
        vendor: opts.vendor ?? '',
        product_type: opts.productType ?? '',
        status: 'draft',
        options,
        variants: [variant],
        images: opts.images.map((img, i) => ({
          ...(img.base64 ? { attachment: img.base64 } : { src: img.src }),
          filename: img.filename,
          position: i + 1,
        })),
        ...(opts.metafields?.length ? { metafields: opts.metafields } : {}),
      },
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
        if (parsed.errors) detail = JSON.stringify(parsed.errors).slice(0, 300)
      } catch { /* keep raw text */ }
      throw new Error(`Shopify ${res.status}: ${detail}`)
    }

    const rawText = await res.text().catch(() => '')
    let json: { product: { id: number } }
    try {
      json = JSON.parse(rawText)
    } catch {
      throw new Error(`Shopify returned non-JSON: ${rawText.slice(0, 200)}`)
    }
    const { product } = json
    const shopDomain = this.baseUrl.split('/admin/')[0].replace('https://', '')
    return {
      id: String(product.id),
      adminUrl: `https://${shopDomain}/admin/products/${product.id}`,
    }
  }

}
