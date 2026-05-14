import { createClient } from '@/lib/supabase/client'
import type { CloudConnections } from '@/lib/cloud/types'

export interface Brand {
  id: string
  org_id: string
  name: string
  brand_code: string
  supplier_code: string | null   // e.g. "PR" — used in {SUPPLIER_CODE} naming token
  season: string | null          // e.g. "SS25" — used in {SEASON} naming token
  shopify_store_url: string | null
  shopify_access_token: string | null
  shopify_authenticated?: boolean
  iconic_user_id?: string | null
  iconic_api_key?: string | null
  logo_color: string
  images_per_look: number
  still_life_images_per_look: number
  on_model_angle_sequence: string[]
  still_life_angle_sequences: Record<string, string[]>  // keyed by accessory category id
  naming_template: string
  gm_position: 'first' | 'last' | null
  /** Cloud storage connections (Dropbox, Google Drive, S3) stored per brand */
  cloud_connections: CloudConnections | null
  voice_brief: string | null
  copy_examples: string[] | null
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
//   {VIEW_NUM}      — numeric view code (1–6), category-aware: bottoms use front=1 map, others use full-length=1 map
//   {INDEX}         — image position within cluster, unpadded (e.g. 1, 2, 3)
//   {ANGLE_NUMBER}  — alias for {INDEX}
//   {SEASON}        — season code set on the brand (e.g. SS25)
//   {CUSTOM_TEXT}   — fixed text string stored in the naming preset

// Non-bottoms: Full Length=1, Side=2, Back=3, Mood=4, Front=5, Detail=6
const VIEW_NUM_DEFAULT: Record<string, string> = {
  'full-length': '1', 'full_length': '1',
  'side': '2',
  'back': '3', 'back-3/4': '3', 'back_3/4': '3',
  'mood': '4',
  'front': '5', 'front-3/4': '5', 'front_3/4': '5',
  'detail': '6',
  'ghost-mannequin': '7', 'flat-lay': '8', 'top-down': '8', 'inside': '9',
}

// Bottoms (pants, skirts, etc.): Front=1, Side=2, Back=3, Mood=4, Full Length=5, Detail=6
const VIEW_NUM_BOTTOMS: Record<string, string> = {
  'front': '1', 'front-3/4': '1', 'front_3/4': '1',
  'side': '2',
  'back': '3', 'back-3/4': '3', 'back_3/4': '3',
  'mood': '4',
  'full-length': '5', 'full_length': '5',
  'detail': '6',
  'ghost-mannequin': '7', 'flat-lay': '8', 'top-down': '8', 'inside': '9',
}

export function getViewNum(viewLabel: string, isBottomwear: boolean): string {
  const key = viewLabel.toLowerCase()
  const map = isBottomwear ? VIEW_NUM_BOTTOMS : VIEW_NUM_DEFAULT
  return map[key] ?? '1'
}

export function applyNamingTemplate(
  template: string,
  vars: {
    brand: string
    seq: number
    sku?: string
    color?: string
    view: string
    index: number
    isBottomwear?: boolean
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
  const viewNum = getViewNum(vars.view, vars.isBottomwear ?? false)
  const idx = String(vars.index)
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
      .replace(/\{VIEW_NUM\}/g, viewNum)
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
    cloud_connections: null,
    voice_brief: null,
    copy_examples: null,
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
    cloud_connections: null,
    voice_brief: null,
    copy_examples: null,
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
    cloud_connections: null,
    voice_brief: null,
    copy_examples: null,
    created_at: new Date().toISOString(),
  },
]
