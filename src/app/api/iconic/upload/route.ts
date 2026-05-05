import { NextRequest, NextResponse } from 'next/server'

// TODO: implement when SellerCenter test credentials are available
// This route will mirror /api/shopify/upload but use the SellerCenter XML API:
//   1. Validate auth + brand credentials (iconic_user_id + iconic_api_key)
//   2. Stage images to public Supabase Storage URLs
//   3. Submit ProductCreate XML feed → get FeedID
//   4. Submit Image XML feed with public URLs → get FeedID
//   5. Poll FeedStatus until complete
//   6. Return results per cluster

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'The Iconic direct integration is coming soon.' },
    { status: 501 }
  )
}
