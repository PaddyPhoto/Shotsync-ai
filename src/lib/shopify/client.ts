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

  // Find a product's Shopify ID by searching for a matching SKU across variants
  async findProductIdBySku(sku: string): Promise<string | null> {
    const url = `${this.baseUrl}/products.json?limit=250&fields=id,variants`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) return null
    const { products } = await res.json() as { products: { id: number; variants: { sku: string }[] }[] }
    const match = products.find((p) => p.variants.some((v) => v.sku?.toLowerCase() === sku.toLowerCase()))
    return match ? String(match.id) : null
  }

  // Upload a base64-encoded image to a Shopify product
  async uploadProductImage(productId: string, base64: string, filename: string, position: number): Promise<boolean> {
    const url = `${this.baseUrl}/products/${productId}/images.json`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        image: {
          attachment: base64,
          filename,
          position,
        },
      }),
    })
    return res.ok
  }

  // Update a product's title and body HTML (description + bullets)
  async updateProductCopy(productId: string, title: string, bodyHtml: string): Promise<boolean> {
    const url = `${this.baseUrl}/products/${productId}.json`
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ product: { id: Number(productId), title, body_html: bodyHtml } }),
    })
    return res.ok
  }

  // Delete all existing images on a product (for clean re-upload)
  async clearProductImages(productId: string): Promise<void> {
    const listUrl = `${this.baseUrl}/products/${productId}/images.json?fields=id`
    const res = await fetch(listUrl, { headers: this.headers })
    if (!res.ok) return
    const { images } = await res.json() as { images: { id: number }[] }
    await Promise.all(
      images.map((img) =>
        fetch(`${this.baseUrl}/products/${productId}/images/${img.id}.json`, {
          method: 'DELETE',
          headers: this.headers,
        })
      )
    )
  }

}
