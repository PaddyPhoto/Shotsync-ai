import crypto from 'crypto'

const BASE_URL = 'https://sellercenter.theiconic.com.au/index.php'

export interface SellerCenterCredentials {
  userId: string      // seller email address
  apiKey: string      // API key from SellerCenter account settings
}

export interface SellerCenterProduct {
  sku: string
  name: string
  brand: string
  description?: string
  price?: number
  primaryCategory?: string
  images: string[]    // public HTTPS URLs
}

export interface FeedResult {
  feedId: string
  status: 'pending' | 'processing' | 'success' | 'error'
  errors?: string[]
}

// TODO: implement when SellerCenter test account is available
export class SellerCenterClient {
  constructor(private creds: SellerCenterCredentials) {}

  private sign(params: Record<string, string>): string {
    // SellerCenter HMAC-SHA256 signing:
    // 1. Sort params alphabetically by key (exclude 'Signature')
    // 2. URL-encode as query string
    // 3. HMAC-SHA256 with apiKey as secret
    const sorted = Object.keys(params).sort().map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&')
    return crypto.createHmac('sha256', this.creds.apiKey).update(sorted).digest('hex')
  }

  private buildUrl(action: string, extraParams: Record<string, string> = {}): string {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00')
    const params: Record<string, string> = {
      Action: action,
      Format: 'XML',
      Timestamp: timestamp,
      UserID: this.creds.userId,
      Version: '1.0',
      ...extraParams,
    }
    const signature = this.sign(params)
    const qs = Object.keys(params).sort().map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&')
    return `${BASE_URL}?${qs}&Signature=${signature}`
  }

  // TODO: implement ProductCreate — submits XML feed, returns FeedID
  async createProduct(_product: SellerCenterProduct): Promise<string> {
    throw new Error('SellerCenter integration coming soon')
  }

  // TODO: implement Image (SetImages) — attaches public image URLs to a SKU
  async setImages(_sku: string, _imageUrls: string[]): Promise<string> {
    throw new Error('SellerCenter integration coming soon')
  }

  // TODO: implement FeedStatus — polls async feed until success or error
  async getFeedStatus(_feedId: string): Promise<FeedResult> {
    throw new Error('SellerCenter integration coming soon')
  }

  // TODO: implement GetCategoryTree — fetch available categories for UI picker
  async getCategoryTree(): Promise<{ id: string; name: string; path: string }[]> {
    throw new Error('SellerCenter integration coming soon')
  }
}
