import { createServiceClient } from '@/lib/supabase/server'

export interface ImportRow {
  sku: string
  title: string
  category?: string
  gender?: string
  season?: string
  colourway: string
  colour_hex?: string
  rrp?: string
  sizes?: string        // pipe-separated e.g. XS|S|M|L|XL
  composition?: string
  care?: string
  fit?: string
  origin?: string
}

export async function upsertProducts(
  rows: ImportRow[],
  orgId: string,
  brandId: string,
): Promise<{ created: number; updated: number; errors: string[]; total: number }> {
  const service = createServiceClient()
  let created = 0
  let updated = 0
  const errors: string[] = []

  // Group rows by SKU — each group = one product, each row = one colourway
  const bySku = new Map<string, ImportRow[]>()
  for (const row of rows) {
    if (!row.sku?.trim() || !row.title?.trim()) continue
    const sku = row.sku.trim().toUpperCase()
    if (!bySku.has(sku)) bySku.set(sku, [])
    bySku.get(sku)!.push(row)
  }

  for (const [sku, skuRows] of bySku) {
    try {
      const first = skuRows[0]

      const { data: existing } = await service
        .from('products')
        .select('id')
        .eq('org_id', orgId)
        .eq('sku', sku)
        .single()

      let productId: string

      if (existing) {
        productId = existing.id
        await service.from('products').update({
          title: first.title.trim(),
          category: first.category?.trim() || null,
          gender: first.gender?.trim() || null,
          season: first.season?.trim() || null,
        }).eq('id', productId)
        updated++
      } else {
        const { data: newProduct, error: pe } = await service
          .from('products')
          .insert({
            org_id: orgId,
            brand_id: brandId,
            sku,
            title: first.title.trim(),
            category: first.category?.trim() || null,
            gender: first.gender?.trim() || null,
            season: first.season?.trim() || null,
            status: 'draft',
          })
          .select('id')
          .single()
        if (pe || !newProduct) { errors.push(`${sku}: ${pe?.message}`); continue }
        productId = newProduct.id
        created++
      }

      // Upsert shared attributes
      const attrs: { key: string; value: string }[] = []
      if (first.composition) attrs.push({ key: 'composition', value: first.composition })
      if (first.care)        attrs.push({ key: 'care',        value: first.care })
      if (first.fit)         attrs.push({ key: 'fit',         value: first.fit })
      if (first.origin)      attrs.push({ key: 'origin',      value: first.origin })
      for (const attr of attrs) {
        await service.from('product_attributes')
          .upsert({ product_id: productId, key: attr.key, value: attr.value }, { onConflict: 'product_id,key' })
      }

      // Upsert colourways + variants
      for (const row of skuRows) {
        if (!row.colourway?.trim()) continue
        const { data: existingCw } = await service
          .from('product_colourways')
          .select('id')
          .eq('product_id', productId)
          .ilike('colour_name', row.colourway.trim())
          .single()

        let colourwayId: string
        if (existingCw) {
          colourwayId = existingCw.id
          await service.from('product_colourways').update({
            colour_code: row.colour_hex?.trim() || null,
            rrp: row.rrp ? parseFloat(row.rrp) : null,
          }).eq('id', colourwayId)
        } else {
          const { data: newCw, error: cwe } = await service
            .from('product_colourways')
            .insert({
              product_id: productId,
              colour_name: row.colourway.trim(),
              colour_code: row.colour_hex?.trim() || null,
              rrp: row.rrp ? parseFloat(row.rrp) : null,
            })
            .select('id')
            .single()
          if (cwe || !newCw) continue
          colourwayId = newCw.id
        }

        const sizes = (row.sizes || 'XS|S|M|L|XL').split('|').map((s) => s.trim()).filter(Boolean)
        const rrp = row.rrp ? parseFloat(row.rrp) : null
        for (const size of sizes) {
          await service.from('product_variants')
            .upsert({
              product_id: productId,
              colourway_id: colourwayId,
              size,
              price: rrp,
              stock: 0,
            }, { onConflict: 'colourway_id,size' })
        }
      }
    } catch (e) {
      errors.push(`${sku}: ${String(e)}`)
    }
  }

  return { created, updated, errors, total: bySku.size }
}
