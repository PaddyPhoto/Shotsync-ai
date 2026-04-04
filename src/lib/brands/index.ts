import { createClient } from '@/lib/supabase/client'

export interface Brand {
  id: string
  org_id: string
  name: string
  brand_code: string
  shopify_store_url: string | null
  shopify_access_token: string | null
  logo_color: string
  images_per_look: number
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
//   {BRAND}  — brand code (e.g. SL)
//   {SEQ}    — cluster sequence number, zero-padded (e.g. 001)
//   {SKU}    — manual SKU override if set, otherwise same as {SEQ}
//   {VIEW}   — angle label (e.g. FRONT, BACK, SIDE)
//   {COLOR}  — cluster color if set
//   {INDEX}  — image index within cluster, zero-padded (e.g. 01)
export function applyNamingTemplate(
  template: string,
  vars: { brand: string; seq: number; sku?: string; color?: string; view: string; index: number }
): string {
  const seq = String(vars.seq).padStart(3, '0')
  const sku = (vars.sku?.trim() || seq).toUpperCase()
  return (
    template
      .replace(/\{BRAND\}/g, vars.brand.toUpperCase())
      .replace(/\{SEQ\}/g, seq)
      .replace(/\{SKU\}/g, sku)
      .replace(/\{COLOR\}/g, (vars.color || '').toUpperCase())
      .replace(/\{VIEW\}/g, vars.view.toUpperCase().replace(/-/g, '_'))
      .replace(/\{INDEX\}/g, String(vars.index).padStart(2, '0'))
  )
}

// ── Demo brands for when Supabase isn't connected ─────────────────────────────
export const DEMO_BRANDS: Brand[] = [
  {
    id: 'demo-brand-1',
    org_id: 'demo-user',
    name: 'Studio Label',
    brand_code: 'SL',
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#e8d97a',
    images_per_look: 4,
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-brand-2',
    org_id: 'demo-user',
    name: 'Active Range',
    brand_code: 'ACT',
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#6de0b3',
    images_per_look: 4,
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-brand-3',
    org_id: 'demo-user',
    name: 'Resort Edit',
    brand_code: 'RES',
    shopify_store_url: null,
    shopify_access_token: null,
    logo_color: '#7ab4e8',
    images_per_look: 4,
    naming_template: DEFAULT_NAMING_TEMPLATE,
    gm_position: 'last',
    created_at: new Date().toISOString(),
  },
]
