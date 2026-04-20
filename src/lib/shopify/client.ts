export class ShopifyClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(shopDomain: string, accessToken: string) {
    this.baseUrl = `https://${shopDomain}/admin/api/2024-01`
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Create a new Shopify product as a draft.
   * Images are uploaded in the same request — one API call per cluster.
   * The ecommerce coordinator can then review, set a price, and publish.
   */
  async createProduct(opts: {
    title: string
    sku: string
    vendor?: string
    color?: string
    bodyHtml?: string
    images: { base64: string; filename: string }[]
  }): Promise<{ id: string; adminUrl: string } | null> {
    const url = `${this.baseUrl}/products.json`

    const options = opts.color ? [{ name: 'Color', values: [opts.color] }] : []
    const variant: Record<string, unknown> = {
      sku: opts.sku,
      price: '0.00',
      inventory_management: null,
    }
    if (opts.color) variant.option1 = opts.color

    const body = {
      product: {
        title: opts.title || opts.sku,
        body_html: opts.bodyHtml ?? '',
        vendor: opts.vendor ?? '',
        status: 'draft',
        options,
        variants: [variant],
        images: opts.images.map((img, i) => ({
          attachment: img.base64,
          filename: img.filename,
          position: i + 1,
        })),
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Shopify createProduct failed:', await res.text())
      return null
    }

    const { product } = await res.json() as { product: { id: number } }
    const shopDomain = this.baseUrl.split('/admin/')[0].replace('https://', '')
    return {
      id: String(product.id),
      adminUrl: `https://${shopDomain}/admin/products/${product.id}`,
    }
  }

}
