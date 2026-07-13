import { NextRequest, NextResponse } from 'next/server'

// Receives CSP violation reports from the browser (report-only mode). Logs a
// compact summary so we can see which legitimate sources need allow-listing
// before switching CSP from report-only to enforcing. Blocks nothing.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const r = body?.['csp-report'] ?? body ?? {}
    console.error('[csp-report]', JSON.stringify({
      blocked: r['blocked-uri'] ?? r.blockedURL,
      directive: r['violated-directive'] ?? r.effectiveDirective,
      docs: r['document-uri'] ?? r.documentURL,
    }))
  } catch {
    /* ignore malformed reports */
  }
  return new NextResponse(null, { status: 204 })
}
