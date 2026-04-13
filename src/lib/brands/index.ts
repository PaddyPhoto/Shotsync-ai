import { createClient } from '@/lib/supabase/client'

export interface Brand {
  id: string
  org_id: string
  name: string
  brand_code: string
  supplier_code: string | null   // e.g. "PR" — used in {SUPPLIER_CODE} naming token
  season: string | null          // e.g. "SS25" — used in {SEASON} naming token
  shopify_store_url: string | null
  shopify_access_token: string | null
  logo_color: string
  images_per_look: number
  still_life_images_per_look: number
  on_model_angle_sequence: string[]
  still_life_angle_sequences: Record<string, string[]>  // keyed by accessory category id
  naming_template: string
  gm_position: 'first' | 'last' | null
  created_at: string
}

export type BrandInput = Omit<Brand, 'id' | 'org_id' | 'created_at'>

export async function getBrands(orgId: string): Promise<Brand[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createBrand(orgId: string, input: BrandInput): Promise<Brand> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('brands')
    .insert({ ...input, org_id: orgId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateBrand(id: string, input: Partial<BrandInput>): Promise<Brand> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('brands')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteBrand(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export const DEFAULT_NAMING_TEMPLATE = '{BRAND}_{SEQ}_{VIEW}'

// ── Apply a naming template to generate a filename ────────────────────────────
// Available tokens:
//   {BRAND}         — brand code (e.g. FBC)
//   {BRAND_CODE}    — alias for {BRAND}
//   {SUPPLIER_CODE} — supplier code set on the brand (e.g. PR)
//   {SEQ}           — cluster sequence number, zero-padded (e.g. 001)
//   {SKU}           — assigned SKU (e.g. SS25-0042)
//   {STYLE_NUMBER}  — style number per cluster (e.g. 05324); falls back to SKU
//   {COLOUR_NAME}   — alias for {COLOR} (e.g. BURGUNDY)
//   {COLOR}         — cluster colour name (e.g. BLACK)
//   {COLOUR_CODE}   — numeric colour code per cluster (e.g. 062)
//   {VIEW}          — angle label (e.g. FRONT, BACK, SIDE)
//   {ANGLE}         — alias for {VIEW}
//   {INDEX}         — image index within cluster, zero-padded (e.g. 01)
//   {ANGLE_NUMBER}  — alias for {INDEX}
//   {SEASON}        — season code set on the brand (e.g. SS25)
//   {CUSTOM_TEXT}   — fixed text string stored in the naming preset
export function applyNamingTemplate(
  template: string,
  vars: {
    brand: string
    seq: number
    sku?: string
    color?: string
    view: string
    index: number
    supplierCode?: string
    styleNumber?: string
    colourCode?: string
    season?: string
    customText?: string
  }
): string {
  const seq = String(vars.seq).padStart(3, '0')
  const sku = (vars.sku?.trim() || seq).toUpperCase()
  const view = vars.view.toUpperCase().replace(/-/g, '_')
  const idx = String(vars.index).padStart(2, '0')
  const brand = vars.brand.toUpperCase()
  const color = (vars.color || '').toUpperCase()
  return (
    template
      .replace(/\{BRAND_CODE\}/g, brand)
      .replace(/\{BRAND\}/g, brand)
      .replace(/\{SUPPLIER_CODE\}/g, (vars.supplierCode || '').toUpperCase())
      .replace(/\{SEASON\}/g, (vars.season || '').toUpperCase())
      .replace(/\{SEQ\}/g, seq)
      .replace(/\{SKU\}/g, sku)
      .replace(/\{STYLE_NUMBER\}/g, (vars.styleNumber?.trim() || sku).toUpperCase())
      .replace(/\{COLOUR_NAME\}/g, color)
      .replace(/\{COLOR\}/g, color)
      .replace(/\{COLOUR_CODE\}/g, (vars.colourCode || '').toUpperCase())
      .replace(/\{ANGLE_NUMBER\}/g, idx)
      .replace(/\{INDEX\}/g, idx)
      .replace(/\{ANGLE\}/g, view)
      .replace(/\{VIEW\}/g, view)
      .replace(/\{CUSTOM_TEXT\}/g, (vars.customText || '').toUpperCase())
      // Clean up empty token slots: collapse consecutive underscores and trim edges
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  )
}

// ── Demo brands for when Supabase isn't connected ─────────────────────────────
export const DEMO_BRANDS: Brand[] = [
  {
    id: 'demo-brand-1',
    org_id: 'demo-user',
    name: 'Studio Label',
    brand_code: 'SL',
    supplier_code: null,
    season: null,
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#e8d97a',
    images_per_look: 4,
    still_life_images_per_look: 2,
    on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
    still_life_angle_sequences: {},
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-brand-2',
    org_id: 'demo-user',
    name: 'Active Range',
    brand_code: 'ACT',
    supplier_code: null,
    season: null,
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#6de0b3',
    images_per_look: 4,
    still_life_images_per_look: 2,
    on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
    still_life_angle_sequences: {},
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-brand-3',
    org_id: 'demo-user',
    name: 'Resort Edit',
    brand_code: 'RES',
    supplier_code: null,
    season: null,
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#7ab4e8',
    images_per_look: 4,
    still_life_images_per_look: 2,
    on_model_angle_sequence: ['full-length', 'front', 'side', 'mood', 'detail', 'back'],
    still_life_angle_sequences: {},
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
]
