import type { SKU, SKUVariant } from '@/types'

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  variants: ShopifyVariant[]
  images: { src: string }[]
  tags: string
}

interface ShopifyVariant {
  id: number
  title: string
  sku: string
  price: string
}

function extractColour(product: ShopifyProduct): string | null {
  // Try to extract colour from variant titles or tags
  const colourKeywords = ['black', 'white', 'red', 'blue', 'green', 'navy', 'pink',
    'grey', 'gray', 'beige', 'brown', 'cream', 'ivory', 'yellow', 'orange', 'purple']
  const text = [product.title, product.tags, ...product.variants.map(v => v.title)]
    .join(' ').toLowerCase()
  return colourKeywords.find(c => text.includes(c)) ?? null
}

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

  async getProducts(limit = 250): Promise<SKU[]> {
    const url = `${this.baseUrl}/products.json?limit=${limit}&fields=id,title,handle,variants,images,tags`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)
    const { products } = await res.json() as { products: ShopifyProduct[] }

    return products.flatMap((product) =>
      product.variants
        .filter((v) => v.sku)
        .map((variant): SKU => ({
          sku: variant.sku,
          product_name: product.title,
          colour: extractColour(product),
          variants: product.variants.map((v): SKUVariant => ({
            id: String(v.id),
            title: v.title,
            sku: v.sku,
            price: v.price,
          })),
          shopify_product_id: String(product.id),
          shopify_handle: product.handle,
          image_url: product.images[0]?.src ?? null,
        }))
    )
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

  async searchProducts(query: string): Promise<SKU[]> {
    const url = `${this.baseUrl}/products.json?title=${encodeURIComponent(query)}&limit=50`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)
    const { products } = await res.json() as { products: ShopifyProduct[] }

    return products.flatMap((product) =>
      product.variants.filter((v) => v.sku).map((variant): SKU => ({
        sku: variant.sku,
        product_name: product.title,
        colour: extractColour(product),
        variants: product.variants.map((v): SKUVariant => ({
          id: String(v.id),
          title: v.title,
          sku: v.sku,
          price: v.price,
        })),
        shopify_product_id: String(product.id),
        shopify_handle: product.handle,
        image_url: product.images[0]?.src ?? null,
      }))
    )
  }
}

// Mock data for development / demo
export const MOCK_SKUS: SKU[] = [
  { sku: 'TOP-BLK-001', product_name: 'Classic Crew Neck Tee', colour: 'Black', variants: [], shopify_product_id: '1001', shopify_handle: 'classic-crew-neck-tee', image_url: null },
  { sku: 'TOP-WHT-001', product_name: 'Classic Crew Neck Tee', colour: 'White', variants: [], shopify_product_id: '1001', shopify_handle: 'classic-crew-neck-tee', image_url: null },
  { sku: 'DRS-NVY-002', product_name: 'Wrap Midi Dress', colour: 'Navy', variants: [], shopify_product_id: '1002', shopify_handle: 'wrap-midi-dress', image_url: null },
  { sku: 'DRS-BLK-002', product_name: 'Wrap Midi Dress', colour: 'Black', variants: [], shopify_product_id: '1002', shopify_handle: 'wrap-midi-dress', image_url: null },
  { sku: 'JKT-BEI-003', product_name: 'Relaxed Linen Blazer', colour: 'Beige', variants: [], shopify_product_id: '1003', shopify_handle: 'relaxed-linen-blazer', image_url: null },
  { sku: 'PNT-BLK-004', product_name: 'Wide Leg Trousers', colour: 'Black', variants: [], shopify_product_id: '1004', shopify_handle: 'wide-leg-trousers', image_url: null },
  { sku: 'SKT-FLR-005', product_name: 'Floral Midi Skirt', colour: 'Floral', variants: [], shopify_product_id: '1005', shopify_handle: 'floral-midi-skirt', image_url: null },
]
