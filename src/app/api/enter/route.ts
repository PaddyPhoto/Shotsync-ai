import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD
const GATE_COOKIE = 'ss_gate'

export async function POST(req: NextRequest) {
  if (!SITE_PASSWORD) {
    return NextResponse.json({ ok: true })
  }

  const { password } = await req.json()

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(GATE_COOKIE, SITE_PASSWORD, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // No maxAge = session cookie; close browser = ask again
    // Set maxAge in seconds if you want it to persist, e.g. 30 days:
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
