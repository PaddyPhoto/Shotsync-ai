import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

function getEdmHtml(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>ShotSync.ai — From shoot to marketplace in minutes</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { background:#e8e8ed;font-family:-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1d1d1f; }
  .wrap { max-width:680px;margin:0 auto;background:#e8e8ed; }
  .header { padding:20px 36px;background:rgba(245,245,247,0.96);border-bottom:0.5px solid rgba(0,0,0,0.08); }
  .logo-wordmark { font-size:16px;font-weight:600;letter-spacing:-0.4px;color:#1d1d1f;vertical-align:middle;margin-left:8px; }
  .logo-wordmark span { color:#6e6e73; }
  .header-tag { font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#aeaeb2;text-align:right; }
  .hero { padding:60px 48px 52px;background:#f5f5f7;border-bottom:0.5px solid rgba(0,0,0,0.08);text-align:center;position:relative;overflow:hidden; }
  .orb { position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none;opacity:0.7; }
  .orb-1 { width:300px;height:300px;background:rgba(0,113,227,0.35);top:-90px;left:-70px; }
  .orb-2 { width:280px;height:280px;background:rgba(94,50,245,0.28);top:-50px;right:-60px; }
  .orb-3 { width:260px;height:260px;background:rgba(48,209,88,0.28);bottom:-70px;left:10px; }
  .orb-4 { width:220px;height:220px;background:rgba(0,190,220,0.25);bottom:-50px;right:20px; }
  .hero-inner { position:relative;z-index:1; }
  .eyebrow { display:inline-block;background:#fff;border:0.5px solid rgba(0,0,0,0.08);border-radius:999px;padding:5px 14px;font-size:12px;font-weight:500;color:#6e6e73;letter-spacing:-0.1px;margin-bottom:24px; }
  .eyebrow-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#30d158;margin-right:6px;vertical-align:middle;position:relative;top:-1px; }
  .hero-title { font-size:52px;font-weight:500;letter-spacing:-2.2px;line-height:1.05;color:#1d1d1f;margin-bottom:18px; }
  .hero-title span { color:#6e6e73; }
  .hero-sub { font-size:17px;line-height:1.55;color:#6e6e73;max-width:460px;margin:0 auto 36px;letter-spacing:-0.3px; }
  .btn-dark { display:inline-block;background:#1d1d1f;color:#f5f5f7 !important;font-size:14px;font-weight:500;letter-spacing:-0.3px;padding:13px 30px;border-radius:10px;text-decoration:none;margin-right:8px; }
  .btn-light { display:inline-block;background:#fff;color:#1d1d1f !important;font-size:14px;font-weight:500;padding:13px 26px;text-decoration:none;letter-spacing:-0.3px;border-radius:10px;border:0.5px solid rgba(0,0,0,0.12); }
  .stats { background:#fff;border:0.5px solid rgba(0,0,0,0.08);border-radius:16px;margin-top:40px;overflow:hidden; }
  .stat { padding:20px 16px;text-align:center;border-right:0.5px solid rgba(0,0,0,0.06); }
  .stat-last { border-right:none; }
  .stat-val { font-size:26px;font-weight:500;letter-spacing:-1px;color:#1d1d1f;line-height:1;margin-bottom:4px; }
  .stat-green { color:#30d158; }
  .stat-blue { color:#007aff; }
  .stat-lbl { font-size:11px;color:#aeaeb2;letter-spacing:-0.1px; }
  .spacer { height:12px; }
  .card { background:#fff;border-radius:16px;padding:36px 40px; }
  .card-label { font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#aeaeb2;margin-bottom:8px; }
  .card-title { font-size:26px;font-weight:500;letter-spacing:-0.9px;color:#1d1d1f;margin-bottom:24px;line-height:1.2; }
  .step-icon-wrap { width:36px;height:36px;background:rgba(0,0,0,0.04);border:0.5px solid rgba(0,0,0,0.08);border-radius:10px;display:inline-block;text-align:center;line-height:36px;vertical-align:middle; }
  .step-text { font-size:12px;font-weight:500;color:#494949;letter-spacing:-0.1px;vertical-align:middle;margin-left:7px; }
  .step-arrow { font-size:14px;color:#d1d1d6;padding:0 8px;vertical-align:middle; }
  .feat-icon { width:36px;height:36px;border-radius:9px;display:block;text-align:center;line-height:36px;margin-bottom:12px; }
  .fi-blue { background:rgba(0,122,255,0.10); }
  .fi-green { background:rgba(48,209,88,0.10); }
  .fi-orange { background:rgba(255,159,10,0.10); }
  .fi-purple { background:rgba(175,82,222,0.10); }
  .feat-name { font-size:13px;font-weight:600;color:#1d1d1f;letter-spacing:-0.2px;margin-bottom:5px; }
  .feat-desc { font-size:12px;color:#6e6e73;line-height:1.55; }
  .feat-cell { background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:12px;padding:20px;vertical-align:top; }
  .chip { display:inline-block;background:rgba(0,0,0,0.04);border:0.5px solid rgba(0,0,0,0.08);border-radius:999px;padding:7px 18px;font-size:12px;font-weight:500;color:#494949;margin:4px; }
  .plan-cell { background:rgba(0,0,0,0.02);border:0.5px solid rgba(0,0,0,0.07);border-radius:14px;padding:22px;vertical-align:top;text-align:left; }
  .plan-cell-dark { background:#1d1d1f;border-color:#1d1d1f; }
  .plan-badge { display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;background:rgba(0,122,255,0.1);color:#007aff;border-radius:999px;padding:3px 10px;margin-bottom:10px; }
  .plan-badge-dark { background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.65); }
  .plan-name { font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:4px;letter-spacing:-0.2px; }
  .plan-name-light { color:#f5f5f7; }
  .plan-price { font-size:32px;font-weight:500;letter-spacing:-1.3px;color:#1d1d1f;line-height:1;margin-bottom:2px; }
  .plan-price-light { color:#f5f5f7; }
  .plan-period { font-size:11px;color:#aeaeb2;margin-bottom:14px; }
  .plan-period-light { color:rgba(255,255,255,0.35); }
  .plan-feat { font-size:11px;color:#6e6e73;padding:6px 0;border-top:0.5px solid rgba(0,0,0,0.05); }
  .plan-feat-light { color:rgba(255,255,255,0.5);border-top-color:rgba(255,255,255,0.07); }
  .check { color:#30d158;font-weight:700;margin-right:6px; }
  .cta-block { background:#1d1d1f;border-radius:20px;padding:60px 48px;text-align:center;position:relative;overflow:hidden; }
  .cta-orb-1 { position:absolute;width:320px;height:320px;background:rgba(0,113,227,0.3);border-radius:50%;filter:blur(80px);top:-110px;left:-70px;pointer-events:none; }
  .cta-orb-2 { position:absolute;width:280px;height:280px;background:rgba(94,50,245,0.25);border-radius:50%;filter:blur(80px);bottom:-90px;right:-50px;pointer-events:none; }
  .cta-inner { position:relative;z-index:1; }
  .cta-title { font-size:34px;font-weight:500;letter-spacing:-1.3px;color:#f5f5f7;margin-bottom:14px;line-height:1.15; }
  .cta-sub { font-size:15px;color:rgba(255,255,255,0.42);margin-bottom:34px;line-height:1.55;letter-spacing:-0.2px; }
  .btn-cta { display:inline-block;background:#f5f5f7;color:#1d1d1f !important;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:14px 34px;border-radius:10px;text-decoration:none; }
  .cta-note { font-size:11px;color:rgba(255,255,255,0.22);margin-top:16px; }
  .footer { padding:28px 40px;text-align:center; }
  .footer a { font-size:12px;color:#aeaeb2 !important;text-decoration:none;margin:0 10px; }
  .footer-copy { font-size:11px;color:#c7c7cc;line-height:1.7;margin-top:14px; }
</style>
</head>
<body>
<div class="wrap">

  <!-- HEADER -->
  <div class="header">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;">
          <img src="https://shotsync.ai/icon.png" width="30" height="30" alt="ShotSync" style="border-radius:8px;vertical-align:middle;display:inline-block;">
          <span class="logo-wordmark">Shot<span>Sync</span></span>
        </td>
        <td class="header-tag" style="vertical-align:middle;text-align:right;">Product Launch</td>
      </tr>
    </table>
  </div>

  <!-- HERO -->
  <div class="hero">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>
    <div class="hero-inner">
      <div class="eyebrow"><span class="eyebrow-dot"></span>Now live — try free today</div>
      <h1 class="hero-title">Post-production.<br><span>On autopilot.</span></h1>
      <p class="hero-sub">Upload your shoot. ShotSync groups, names, resizes and exports your images to every marketplace — automatically.</p>
      <a href="https://shotsync.ai/signup" class="btn-dark">Start free</a>
      <a href="https://shotsync.ai" class="btn-light">Watch demo &rarr;</a>
      <div class="stats">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stat" style="border-right:0.5px solid rgba(0,0,0,0.06);">
              <div class="stat-val">2–3 days</div><div class="stat-lbl">Manual post-production</div>
            </td>
            <td class="stat" style="border-right:0.5px solid rgba(0,0,0,0.06);">
              <div class="stat-val stat-green">25 min</div><div class="stat-lbl">With ShotSync</div>
            </td>
            <td class="stat" style="border-right:0.5px solid rgba(0,0,0,0.06);">
              <div class="stat-val">500+</div><div class="stat-lbl">Images per job</div>
            </td>
            <td class="stat stat-last">
              <div class="stat-val stat-blue">4</div><div class="stat-lbl">ANZ marketplaces</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <div class="spacer"></div>

  <!-- WORKFLOW -->
  <div class="card">
    <div class="card-label" style="text-align:center;margin-bottom:20px;">How it works</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align:center;">
      <tr>
        <td style="text-align:center;white-space:nowrap;padding:0 6px;">
          <span class="step-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#494949" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;">
              <path d="M12 16V8M9 11l3-3 3 3"/><path d="M5 20h14"/><rect x="3" y="3" width="18" height="14" rx="2"/>
            </svg>
          </span>
          <span class="step-text">Upload shoot</span>
        </td>
        <td class="step-arrow">&rsaquo;</td>
        <td style="text-align:center;white-space:nowrap;padding:0 6px;">
          <span class="step-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#494949" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;">
              <rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="14" y="2" width="8" height="8" rx="1.5"/><rect x="2" y="14" width="8" height="8" rx="1.5"/><rect x="14" y="14" width="8" height="8" rx="1.5"/>
            </svg>
          </span>
          <span class="step-text">AI groups by SKU</span>
        </td>
        <td class="step-arrow">&rsaquo;</td>
        <td style="text-align:center;white-space:nowrap;padding:0 6px;">
          <span class="step-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#494949" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;">
              <path d="M12 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><polyline points="12 3 12 9 19 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
            </svg>
          </span>
          <span class="step-text">Name &amp; format</span>
        </td>
        <td class="step-arrow">&rsaquo;</td>
        <td style="text-align:center;white-space:nowrap;padding:0 6px;">
          <span class="step-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#494949" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </span>
          <span class="step-text">Export to marketplace</span>
        </td>
      </tr>
    </table>
  </div>

  <div class="spacer"></div>

  <!-- FEATURES -->
  <div class="card">
    <div class="card-label">What it does</div>
    <div class="card-title">Everything your team<br>does manually — automated.</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="49%" class="feat-cell">
          <div class="feat-icon fi-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;"><rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="14" y="2" width="8" height="8" rx="1.5"/><rect x="2" y="14" width="8" height="8" rx="1.5"/><rect x="14" y="14" width="8" height="8" rx="1.5"/></svg></div>
          <div class="feat-name">AI Image Grouping</div>
          <div class="feat-desc">Clusters images by SKU using visual embeddings. No manual sorting.</div>
        </td>
        <td width="2%"></td>
        <td width="49%" class="feat-cell">
          <div class="feat-icon fi-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
          <div class="feat-name">Angle Detection</div>
          <div class="feat-desc">Identifies front, back, side and detail shots. Flags missing angles before export.</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:10px;"></td></tr>
      <tr>
        <td width="49%" class="feat-cell">
          <div class="feat-icon fi-orange"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;"><path d="M12 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><polyline points="12 3 12 9 19 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg></div>
          <div class="feat-name">AI Copywriting</div>
          <div class="feat-desc">Generates titles, descriptions and bullet points ready for listing.</div>
        </td>
        <td width="2%"></td>
        <td width="49%" class="feat-cell">
          <div class="feat-icon fi-purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#af52de" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:-2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
          <div class="feat-name">Shopify Upload</div>
          <div class="feat-desc">Push confirmed products directly to your Shopify store as drafts.</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="spacer"></div>

  <!-- MARKETPLACES -->
  <div class="card" style="text-align:center;">
    <div class="card-label" style="margin-bottom:16px;">Exports formatted for</div>
    <span class="chip">The Iconic</span>
    <span class="chip">Myer</span>
    <span class="chip">David Jones</span>
    <span class="chip">Shopify</span>
  </div>

  <div class="spacer"></div>

  <!-- PRICING -->
  <div class="card" style="text-align:center;">
    <div class="card-title">Simple pricing.</div>
    <p style="font-size:13px;color:#aeaeb2;margin-bottom:28px;">Start free. Upgrade when you're ready. Cancel anytime.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td width="48%" class="plan-cell">
          <div class="plan-name">Starter</div>
          <div class="plan-price">$79</div>
          <div class="plan-period">AUD / month</div>
          <div class="plan-feat"><span class="check">&#10003;</span>500 images / month</div>
          <div class="plan-feat"><span class="check">&#10003;</span>2 marketplace exports</div>
          <div class="plan-feat"><span class="check">&#10003;</span>1 brand &middot; 2 seats</div>
          <div class="plan-feat"><span class="check">&#10003;</span>Shopify connection</div>
        </td>
        <td width="4%"></td>
        <td width="48%" class="plan-cell plan-cell-dark">
          <div class="plan-badge plan-badge-dark">Most popular</div>
          <div class="plan-name plan-name-light">Brand</div>
          <div class="plan-price plan-price-light">$199</div>
          <div class="plan-period plan-period-light">AUD / month</div>
          <div class="plan-feat plan-feat-light"><span class="check">&#10003;</span>1,500 images / month</div>
          <div class="plan-feat plan-feat-light"><span class="check">&#10003;</span>All 4 marketplaces</div>
          <div class="plan-feat plan-feat-light"><span class="check">&#10003;</span>3 brands &middot; 5 seats</div>
          <div class="plan-feat plan-feat-light"><span class="check">&#10003;</span>AI copywriting</div>
        </td>
      </tr>
    </table>
    <a href="https://shotsync.ai/#pricing" class="btn-dark">See all plans &rarr;</a>
  </div>

  <div class="spacer"></div>

  <!-- CTA -->
  <div class="cta-block">
    <div class="cta-orb-1"></div>
    <div class="cta-orb-2"></div>
    <div class="cta-inner">
      <h2 class="cta-title">Ready to cut your<br>post-production time in half?</h2>
      <p class="cta-sub">Join ecommerce teams using ShotSync.ai to go from<br>raw shoot to marketplace-ready in minutes.</p>
      <a href="https://shotsync.ai/signup" class="btn-cta">Get started free</a>
      <p class="cta-note">No credit card required &middot; Cancel anytime</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <a href="https://shotsync.ai">Website</a>
      <a href="https://shotsync.ai/#pricing">Pricing</a>
      <a href="https://shotsync.ai/privacy">Privacy</a>
      <a href="https://shotsync.ai/terms">Terms</a>
      <a href="mailto:hello@shotsync.ai">Contact</a>
    </div>
    <div class="footer-copy">
      &copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br>
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
