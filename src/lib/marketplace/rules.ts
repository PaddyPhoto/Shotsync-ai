import type { MarketplaceRule, MarketplaceName, ViewLabel } from '@/types'

export const MARKETPLACE_RULES: Record<MarketplaceName, MarketplaceRule> = {
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    required_views: ['front', 'back', 'side', 'detail', 'mood', 'full-length'],
    image_dimensions: { width: 2369, height: 2953 },
    file_format: 'jpg',
    quality: 100,
    max_file_size_kb: 2000,
    background_color: '#FFFFFF',
    naming_template: '{SKU}_{VIEW}',
    naming_locked: false,
  },
  'the-iconic': {
    id: 'the-iconic',
    name: 'THE ICONIC',
    required_views: ['front', 'back', 'side', 'detail', 'mood', 'full-length'],
    image_dimensions: { width: 1600, height: 2000 },
    file_format: 'jpg',
    quality: 100,
    max_file_size_kb: 2000,
    background_color: '#FFFFFF',
    naming_template: '{SKU}_{INDEX}',
    naming_locked: true,
  },
  'david-jones': {
    id: 'david-jones',
    name: 'David Jones',
    required_views: ['front', 'back', 'side', 'detail', 'mood', 'full-length'],
    image_dimensions: { width: 1600, height: 2000 },
    file_format: 'jpg',
    quality: 100,
    max_file_size_kb: 2000,
    background_color: '#F8F8F8',
    naming_template: '{BRAND}_{SKU}_{VIEW}',
    naming_locked: false,
  },
  myer: {
    id: 'myer',
    name: 'Myer',
    required_views: ['front', 'back', 'side', 'detail', 'mood', 'full-length'],
    image_dimensions: { width: 1551, height: 2000 },
    file_format: 'jpg',
    quality: 100,
    max_file_size_kb: 2000,
    background_color: '#FFFFFF',
    naming_template: '{SKU}_{VIEW}_{INDEX}',
    naming_locked: false,
    remove_background: true,
  },
}

export function getMissingViews(
  detectedViews: ViewLabel[],
  marketplace: MarketplaceName
): ViewLabel[] {
  const required = MARKETPLACE_RULES[marketplace].required_views
  return required.filter((v) => !detectedViews.includes(v))
}

export function applyNamingTemplate(
  template: string,
  vars: { brand?: string; sku?: string; color?: string; view?: string; index?: number }
): string {
  return template
    .replace('{BRAND}', (vars.brand ?? 'BRAND').toUpperCase().replace(/\s+/g, '-'))
    .replace('{SKU}', (vars.sku ?? 'SKU').toUpperCase())
    .replace('{COLOR}', (vars.color ?? 'CLR').toUpperCase().replace(/\s+/g, '-'))
    .replace('{VIEW}', (vars.view ?? 'FRONT').toUpperCase())
    .replace('{INDEX}', String(vars.index ?? 1))
}
