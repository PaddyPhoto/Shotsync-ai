import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Returns all products for the authenticated user's brand — used by the extension popup
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: query real products table once migration is applied
  // const { data: products } = await supabase
  //   .from('products')
  //   .select(`*, product_colourways(*, product_images(*), product_variants(*))`)
  //   .eq('org_id', orgId)

  // Mock response — replace with real DB query after migration
  const mockProducts = [
    {
      id: '1',
      sku: 'PR05324',
      title: 'Relaxed Linen Blazer',
      category: 'Jackets & Blazers',
      gender: 'Womens',
      attributes: { composition: '100% Linen', care: 'Hand wash cold', fit: 'Relaxed', origin: 'Italy' },
      colourways: [
        {
          id: 'cw1',
          name: 'Natural',
          hex: '#e8dcc8',
          rrp: 189,
          listingTitle: 'Relaxed Linen Blazer — Natural',
          listingDescription: 'Cut from pure Italian linen, this relaxed blazer moves effortlessly from desk to dinner.',
          images: [
            { angle: 'front', url: '', filename: 'PR05324_natural_front.jpg' },
            { angle: 'back',  url: '', filename: 'PR05324_natural_back.jpg' },
          ],
          variants: [
            { size: 'XS', barcode: '9341234500001', stock: 8,  price: 189 },
            { size: 'S',  barcode: '9341234500002', stock: 12, price: 189 },
            { size: 'M',  barcode: '9341234500003', stock: 14, price: 189 },
            { size: 'L',  barcode: '9341234500004', stock: 10, price: 189 },
            { size: 'XL', barcode: '9341234500005', stock: 4,  price: 189 },
          ],
        },
        {
          id: 'cw2',
          name: 'Black',
          hex: '#1a1a1a',
          rrp: 189,
          listingTitle: 'Relaxed Linen Blazer — Black',
          listingDescription: 'The same relaxed Italian linen cut, now in a versatile black.',
          images: [
            { angle: 'front', url: '', filename: 'PR05324_black_front.jpg' },
            { angle: 'back',  url: '', filename: 'PR05324_black_back.jpg' },
          ],
          variants: [
            { size: 'XS', barcode: '9341234500011', stock: 6,  price: 189 },
            { size: 'S',  barcode: '9341234500012', stock: 8,  price: 189 },
            { size: 'M',  barcode: '9341234500013', stock: 10, price: 189 },
            { size: 'L',  barcode: '9341234500014', stock: 6,  price: 189 },
            { size: 'XL', barcode: '9341234500015', stock: 2,  price: 189 },
          ],
        },
      ],
    },
  ]

  return NextResponse.json(mockProducts)
}
