import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

function getEdmHtml(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShotSync.ai — From shoot to marketplace in minutes</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { background:#e8e8ed;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1d1d1f; }
  .wrap { max-width:600px;margin:0 auto;background:#e8e8ed; }
  .header { padding:24px 36px;background:rgba(245,245,247,0.9);border-bottom:0.5px solid rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:space-between; }
  .logo-mark { width:28px;height:28px;background:#1d1d1f;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:8px; }
  .logo-text { font-size:16px;font-weight:600;letter-spacing:-0.4px;color:#1d1d1f;vertical-align:middle; }
  .logo-text span { color:#6e6e73; }
  .header-tag { font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#aeaeb2; }
  .hero { padding:56px 36px 48px;background:#f5f5f7;border-bottom:0.5px solid rgba(0,0,0,0.08);text-align:center; }
  .eyebrow { display:inline-block;background:#fff;border:0.5px solid rgba(0,0,0,0.08);border-radius:999px;padding:5px 14px;font-size:12px;font-weight:500;color:#6e6e73;letter-spacing:-0.1px;margin-bottom:24px; }
  .eyebrow-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#30d158;margin-right:6px;vertical-align:middle; }
  .hero-title { font-size:44px;font-weight:500;letter-spacing:-2px;line-height:1.05;color:#1d1d1f;margin-bottom:18px; }
  .hero-title span { color:#6e6e73; }
  .hero-sub { font-size:16px;line-height:1.5;color:#6e6e73;max-width:420px;margin:0 auto 36px;letter-spacing:-0.3px; }
  .btn-dark { display:inline-block;background:#1d1d1f;color:#f5f5f7 !important;font-size:14px;font-weight:500;letter-spacing:-0.3px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-right:8px; }
  .btn-light { display:inline-block;background:#fff;color:#1d1d1f !important;font-size:14px;font-weight:500;padding:12px 24px;text-decoration:none;letter-spacing:-0.3px;border-radius:10px;border:0.5px solid rgba(0,0,0,0.1); }
  .stats { background:#fff;border:0.5px solid rgba(0,0,0,0.08);border-radius:16px;margin-top:40px;overflow:hidden; }
  .stats-row { display:flex; }
  .stat { flex:1;padding:20px 16px;text-align:center;border-right:0.5px solid rgba(0,0,0,0.06); }
  .stat:last-child { border-right:none; }
  .stat-val { font-size:26px;font-weight:500;letter-spacing:-1px;color:#1d1d1f;line-height:1;margin-bottom:4px; }
  .stat-val.green { color:#30d158; }
  .stat-val.blue { color:#007aff; }
  .stat-lbl { font-size:11px;color:#aeaeb2;letter-spacing:-0.1px; }
  .spacer { height:12px; }
  .card { background:#fff;border-radius:16px;padding:36px; }
  .card-label { font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#aeaeb2;margin-bottom:8px; }
  .card-title { font-size:22px;font-weight:500;letter-spacing:-0.8px;color:#1d1d1f;margin-bottom:24px;line-height:1.2; }
  .flow { display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;margin-bottom:0; }
  .flow-step { display:inline-flex;align-items:center;gap:8px;padding:0 10px; }
  .flow-icon { width:34px;height:34px;background:rgba(0,0,0,0.04);border:0.5px solid rgba(0,0,0,0.08);border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:15px; }
  .flow-text { font-size:12px;font-weight:500;color:#494949;letter-spacing:-0.1px; }
  .flow-arrow { font-size:12px;color:#d1d1d6; }
  .feat-grid { display:table;width:100%;border-collapse:separate;border-spacing:10px; }
  .feat-row { display:table-row; }
  .feat-cell { display:table-cell;width:50%;background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;vertical-align:top; }
  .feat-icon { width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;margin-bottom:10px; }
  .fi-blue { background:rgba(0,122,255,0.10); }
  .fi-green { background:rgba(48,209,88,0.10); }
  .fi-orange { background:rgba(255,159,10,0.10); }
  .fi-purple { background:rgba(175,82,222,0.10); }
  .feat-name { font-size:13px;font-weight:600;color:#1d1d1f;letter-spacing:-0.2px;margin-bottom:4px; }
  .feat-desc { font-size:12px;color:#6e6e73;line-height:1.5; }
  .chips { text-align:center; }
  .chip { display:inline-block;background:rgba(0,0,0,0.04);border:0.5px solid rgba(0,0,0,0.08);border-radius:999px;padding:7px 16px;font-size:12px;font-weight:500;color:#494949;margin:4px; }
  .plan-grid { display:table;width:100%;border-collapse:separate;border-spacing:10px;margin-bottom:24px; }
  .plan-cell { display:table-cell;width:50%;background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:20px;vertical-align:top; }
  .plan-cell.featured { background:#1d1d1f;border-color:#1d1d1f; }
  .plan-badge { display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;background:rgba(0,122,255,0.1);color:#007aff;border-radius:999px;padding:3px 10px;margin-bottom:10px; }
  .plan-cell.featured .plan-badge { background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.6); }
  .plan-name { font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:4px;letter-spacing:-0.2px; }
  .plan-cell.featured .plan-name { color:#f5f5f7; }
  .plan-price { font-size:30px;font-weight:500;letter-spacing:-1.2px;color:#1d1d1f;line-height:1;margin-bottom:2px; }
  .plan-cell.featured .plan-price { color:#f5f5f7; }
  .plan-period { font-size:11px;color:#aeaeb2;margin-bottom:14px; }
  .plan-cell.featured .plan-period { color:rgba(255,255,255,0.35); }
  .plan-feat { font-size:11px;color:#6e6e73;padding:5px 0;border-top:0.5px solid rgba(0,0,0,0.05); }
  .plan-cell.featured .plan-feat { color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.07); }
  .check { color:#30d158;font-weight:700;margin-right:5px; }
  .cta-block { background:#1d1d1f;border-radius:20px;padding:56px 36px;text-align:center; }
  .cta-title { font-size:30px;font-weight:500;letter-spacing:-1.2px;color:#f5f5f7;margin-bottom:12px;line-height:1.15; }
  .cta-sub { font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:28px;line-height:1.5;letter-spacing:-0.2px; }
  .btn-cta { display:inline-block;background:#f5f5f7;color:#1d1d1f !important;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none; }
  .cta-note { font-size:11px;color:rgba(255,255,255,0.2);margin-top:14px; }
  .footer { padding:28px 36px;text-align:center; }
  .footer a { font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 10px; }
  .footer-copy { font-size:11px;color:#c7c7cc;line-height:1.6;margin-top:12px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <span>
      <span class="logo-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5f5f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></span>
      <span class="logo-text">Shot<span>Sync</span></span>
    </span>
    <span class="header-tag">Product Launch</span>
  </div>

  <div class="hero">
    <div class="eyebrow"><span class="eyebrow-dot"></span>Now live — try free today</div>
    <h1 class="hero-title">Post-production.<br><span>On autopilot.</span></h1>
    <p class="hero-sub">Upload your shoot. ShotSync groups, names, resizes and exports your images to every marketplace — automatically.</p>
    <a href="https://shotsync.ai/signup" class="btn-dark">Start free</a>
    <a href="https://shotsync.ai" class="btn-light">Watch demo →</a>
    <div class="stats">
      <div class="stats-row">
        <div class="stat"><div class="stat-val">2–3 days</div><div class="stat-lbl">Manual post-production</div></div>
        <div class="stat"><div class="stat-val green">25 min</div><div class="stat-lbl">With ShotSync</div></div>
        <div class="stat"><div class="stat-val">500+</div><div class="stat-lbl">Images per job</div></div>
        <div class="stat"><div class="stat-val blue">4</div><div class="stat-lbl">ANZ marketplaces</div></div>
      </div>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="card">
    <div class="card-label">How it works</div>
    <div class="flow">
      <div class="flow-step"><div class="flow-icon">📸</div><div class="flow-text">Upload shoot</div></div>
      <div class="flow-arrow">›</div>
      <div class="flow-step"><div class="flow-icon">🤖</div><div class="flow-text">AI groups by SKU</div></div>
      <div class="flow-arrow">›</div>
      <div class="flow-step"><div class="flow-icon">✏️</div><div class="flow-text">Name &amp; format</div></div>
      <div class="flow-arrow">›</div>
      <div class="flow-step"><div class="flow-icon">📦</div><div class="flow-text">Export to marketplace</div></div>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="card">
    <div class="card-label">What it does</div>
    <div class="card-title">Everything your team<br>does manually — automated.</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:0 5px 10px 0;vertical-align:top;">
          <div style="background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div class="fi-blue feat-icon">⚡</div>
            <div class="feat-name">AI Image Grouping</div>
            <div class="feat-desc">Clusters images by SKU using visual embeddings. No manual sorting.</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 10px 5px;vertical-align:top;">
          <div style="background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div class="fi-green feat-icon">🎯</div>
            <div class="feat-name">Angle Detection</div>
            <div class="feat-desc">Identifies front, back, side and detail shots. Flags missing angles.</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:0 5px 0 0;vertical-align:top;">
          <div style="background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div class="fi-orange feat-icon">📝</div>
            <div class="feat-name">AI Copywriting</div>
            <div class="feat-desc">Generates titles, descriptions and bullet points ready for listing.</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 5px;vertical-align:top;">
          <div style="background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div class="fi-purple feat-icon">🛍️</div>
            <div class="feat-name">Shopify Upload</div>
            <div class="feat-desc">Push confirmed products directly to Shopify as draft listings.</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="spacer"></div>

  <div class="card" style="text-align:center;">
    <div class="card-label" style="margin-bottom:16px;">Exports formatted for</div>
    <div class="chips">
      <span class="chip">The Iconic</span>
      <span class="chip">Myer</span>
      <span class="chip">David Jones</span>
      <span class="chip">Shopify</span>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="card" style="text-align:center;">
    <div class="card-title">Simple pricing.</div>
    <p style="font-size:13px;color:#aeaeb2;margin-bottom:24px;">Start free. Upgrade when you're ready. Cancel anytime.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:0 5px 0 0;vertical-align:top;">
          <div style="background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:20px;text-align:left;">
            <div class="plan-name">Starter</div>
            <div class="plan-price">$79</div>
            <div class="plan-period">AUD / month</div>
            <div class="plan-feat"><span class="check">✓</span>500 images / month</div>
            <div class="plan-feat"><span class="check">✓</span>2 marketplace exports</div>
            <div class="plan-feat"><span class="check">✓</span>1 brand · 2 seats</div>
            <div class="plan-feat"><span class="check">✓</span>Shopify connection</div>
          </div>
        </td>
        <td width="50%" style="padding:0 0 0 5px;vertical-align:top;">
          <div style="background:#1d1d1f;border:0.5px solid #1d1d1f;border-radius:12px;padding:20px;text-align:left;">
            <div style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);border-radius:999px;padding:3px 10px;margin-bottom:10px;">Most popular</div>
            <div class="plan-name" style="color:#f5f5f7;">Brand</div>
            <div class="plan-price" style="color:#f5f5f7;">$199</div>
            <div class="plan-period" style="color:rgba(255,255,255,0.35);">AUD / month</div>
            <div class="plan-feat" style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.07);"><span class="check">✓</span>1,500 images / month</div>
            <div class="plan-feat" style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.07);"><span class="check">✓</span>All 4 marketplaces</div>
            <div class="plan-feat" style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.07);"><span class="check">✓</span>3 brands · 5 seats</div>
            <div class="plan-feat" style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.07);"><span class="check">✓</span>AI copywriting</div>
          </div>
        </td>
      </tr>
    </table>
    <br>
    <a href="https://shotsync.ai/#pricing" class="btn-dark">See all plans →</a>
  </div>

  <div class="spacer"></div>

  <div class="cta-block">
    <h2 class="cta-title">Ready to cut your<br>post-production time in half?</h2>
    <p class="cta-sub">Join ecommerce teams using ShotSync.ai to go from<br>raw shoot to marketplace-ready in minutes.</p>
    <a href="https://shotsync.ai/signup" class="btn-cta">Get started free</a>
    <p class="cta-note">No credit card required · Cancel anytime</p>
  </div>

  <div class="footer">
    <div>
      <a href="https://shotsync.ai">Website</a>
      <a href="https://shotsync.ai/#pricing">Pricing</a>
      <a href="https://shotsync.ai/privacy">Privacy</a>
      <a href="https://shotsync.ai/terms">Terms</a>
      <a href="mailto:hello@shotsync.ai">Contact</a>
    </div>
    <div class="footer-copy">
      © 2026 ShotSync.ai · hello@shotsync.ai<br>
      <a href="${unsubscribeUrl}" style="color:#aeaeb2;">Unsubscribe</a>
    </div>
  </div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const service = createServiceClient()

    // Verify admin
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await service.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { subject?: string; preview?: boolean }
    const subject = body.subject || 'ShotSync.ai is live — post-production on autopilot'
    const preview = body.preview ?? false

    // Get all users from auth
    const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const emails = users
      .map((u: { email?: string }) => u.email)
      .filter((e: string | undefined): e is string => !!e && e !== ADMIN_EMAIL)

    if (preview) {
      return NextResponse.json({ count: emails.length, emails: emails.slice(0, 5), subject })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send in batches of 50 (Resend batch limit)
    const BATCH = 50
    let sent = 0
    const failed: string[] = []

    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map((email: string) =>
          resend.emails.send({
            from: 'ShotSync <hello@shotsync.ai>',
            to: email,
            replyTo: 'hello@shotsync.ai',
            subject,
            html: getEdmHtml(`${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`),
          })
        )
      )
      results.forEach((r: PromiseSettledResult<unknown>, idx: number) => {
        if (r.status === 'fulfilled') sent++
        else failed.push(batch[idx])
      })
    }

    return NextResponse.json({ sent, failed: failed.length, total: emails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Broadcast failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
