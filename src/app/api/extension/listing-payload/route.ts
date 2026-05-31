import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const { productId, colourwayId, channel } = await req.json()
  if (!productId || !colourwayId || !channel) {
    return NextResponse.json({ error: 'Missing productId, colourwayId or channel' }, { status: 400, headers: CORS })
  }

  // TODO: fetch from real products table after migration
  // For now return a mock payload shaped for the content script

  const payload = {
    title: 'Relaxed Linen Blazer',
    description: 'Cut from pure Italian linen, this relaxed blazer moves effortlessly from desk to dinner. The unstructured silhouette drapes beautifully.',
    category: 'Jackets & Blazers',
    gender: 'Womens',
    colour: 'Natural',
    rrp: 189,
    attributes: {
      composition: '100% Linen',
      care: 'Hand wash cold, lay flat to dry',
      fit: 'Relaxed',
      origin: 'Italy',
    },
    variants: [
      { size: 'XS', barcode: '9341234500001', stock: 8,  price: 189 },
      { size: 'S',  barcode: '9341234500002', stock: 12, price: 189 },
      { size: 'M',  barcode: '9341234500003', stock: 14, price: 189 },
      { size: 'L',  barcode: '9341234500004', stock: 10, price: 189 },
      { size: 'XL', barcode: '9341234500005', stock: 4,  price: 189 },
    ],
    images: [
      { angle: 'front', url: '', filename: 'PR05324_natural_front.jpg' },
      { angle: 'back',  url: '', filename: 'PR05324_natural_back.jpg' },
      { angle: 'side',  url: '', filename: 'PR05324_natural_side.jpg' },
      { angle: 'detail',url: '', filename: 'PR05324_natural_detail.jpg' },
    ],
    channel,
  }

  return NextResponse.json(payload, { headers: CORS })
}
