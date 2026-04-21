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
<title>ShotSync.ai — Post-production on autopilot</title>
</head>
<body style="margin:0;padding:0;background:#e8e8ed;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e8e8ed">
<tr><td align="center" style="padding:0;">

  <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;">

    <!-- HEADER -->
    <tr><td bgcolor="#f5f5f7" style="padding:18px 32px;border-bottom:1px solid rgba(0,0,0,0.08);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="https://shotsync.ai/icon.png" width="28" height="28" alt="ShotSync" style="border-radius:7px;vertical-align:middle;display:inline-block;margin-right:8px;">
            <span style="font-size:15px;font-weight:600;letter-spacing:-0.3px;color:#1d1d1f;vertical-align:middle;">Shot<span style="color:#6e6e73;">Sync</span></span>
          </td>
          <td align="right" style="vertical-align:middle;font-size:11px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:#aeaeb2;">Product Launch</td>
        </tr>
      </table>
    </td></tr>

    <!-- HERO — gradient background, no absolute orbs -->
    <tr><td style="padding:56px 40px 48px;text-align:center;background:linear-gradient(160deg,#dde9ff 0%,#f5f5f7 45%,#d8f5e3 100%);">
      <!-- Eyebrow -->
      <div style="display:inline-block;background:#ffffff;border:1px solid rgba(0,0,0,0.09);border-radius:999px;padding:5px 16px;font-size:12px;font-weight:500;color:#6e6e73;margin-bottom:24px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#30d158;vertical-align:middle;margin-right:6px;position:relative;top:-1px;"></span>Now live — try free today
      </div>
      <!-- Headline -->
      <h1 style="margin:0 0 16px;font-size:48px;font-weight:500;letter-spacing:-2px;line-height:1.06;color:#1d1d1f;">Post-production.<br><span style="color:#6e6e73;">On autopilot.</span></h1>
      <!-- Sub -->
      <p style="margin:0 auto 36px;max-width:440px;font-size:16px;line-height:1.55;color:#6e6e73;letter-spacing:-0.2px;">Upload your shoot. ShotSync groups, names, resizes and exports your images to every marketplace — automatically.</p>
      <!-- CTAs -->
      <a href="https://shotsync.ai/signup" style="display:inline-block;background:#1d1d1f;color:#f5f5f7;font-size:14px;font-weight:500;letter-spacing:-0.2px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-right:8px;">Start free</a>
      <a href="https://shotsync.ai" style="display:inline-block;background:#ffffff;color:#1d1d1f;font-size:14px;font-weight:500;padding:12px 22px;text-decoration:none;letter-spacing:-0.2px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);">Watch demo &rarr;</a>
      <!-- Stats bar -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:40px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:18px 12px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:500;letter-spacing:-1px;color:#1d1d1f;line-height:1;margin-bottom:4px;">2–3 days</div>
            <div style="font-size:11px;color:#aeaeb2;">Manual post-production</div>
          </td>
          <td style="padding:18px 12px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:500;letter-spacing:-1px;color:#30d158;line-height:1;margin-bottom:4px;">25 min</div>
            <div style="font-size:11px;color:#aeaeb2;">With ShotSync</div>
          </td>
          <td style="padding:18px 12px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:500;letter-spacing:-1px;color:#1d1d1f;line-height:1;margin-bottom:4px;">500+</div>
            <div style="font-size:11px;color:#aeaeb2;">Images per job</div>
          </td>
          <td style="padding:18px 12px;text-align:center;">
            <div style="font-size:24px;font-weight:500;letter-spacing:-1px;color:#007aff;line-height:1;margin-bottom:4px;">4</div>
            <div style="font-size:11px;color:#aeaeb2;">ANZ marketplaces</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- SPACER -->
    <tr><td bgcolor="#e8e8ed" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- WORKFLOW -->
    <tr><td bgcolor="#ffffff" style="padding:28px 32px;border:1px solid rgba(0,0,0,0.08);">
      <p style="margin:0 0 18px;text-align:center;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#aeaeb2;">How it works</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:0 4px;">
            <div style="display:inline-block;width:34px;height:34px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:9px;text-align:center;line-height:34px;font-size:16px;vertical-align:middle;">📷</div>
            <div style="font-size:11px;font-weight:500;color:#494949;margin-top:6px;">Upload shoot</div>
          </td>
          <td align="center" style="font-size:16px;color:#d1d1d6;padding:0 2px;">&rsaquo;</td>
          <td align="center" style="padding:0 4px;">
            <div style="display:inline-block;width:34px;height:34px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:9px;text-align:center;line-height:34px;font-size:16px;vertical-align:middle;">🤖</div>
            <div style="font-size:11px;font-weight:500;color:#494949;margin-top:6px;">AI groups by SKU</div>
          </td>
          <td align="center" style="font-size:16px;color:#d1d1d6;padding:0 2px;">&rsaquo;</td>
          <td align="center" style="padding:0 4px;">
            <div style="display:inline-block;width:34px;height:34px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:9px;text-align:center;line-height:34px;font-size:16px;vertical-align:middle;">🏷️</div>
            <div style="font-size:11px;font-weight:500;color:#494949;margin-top:6px;">Name &amp; format</div>
          </td>
          <td align="center" style="font-size:16px;color:#d1d1d6;padding:0 2px;">&rsaquo;</td>
          <td align="center" style="padding:0 4px;">
            <div style="display:inline-block;width:34px;height:34px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:9px;text-align:center;line-height:34px;font-size:16px;vertical-align:middle;">📦</div>
            <div style="font-size:11px;font-weight:500;color:#494949;margin-top:6px;">Export</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- SPACER -->
    <tr><td bgcolor="#e8e8ed" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- FEATURES -->
    <tr><td bgcolor="#ffffff" style="padding:32px;border:1px solid rgba(0,0,0,0.08);">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#aeaeb2;">What it does</p>
      <h2 style="margin:0 0 24px;font-size:24px;font-weight:500;letter-spacing:-0.8px;color:#1d1d1f;line-height:1.2;">Everything your team<br>does manually — automated.</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="49%" valign="top" style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div style="width:34px;height:34px;background:rgba(0,122,255,0.10);border-radius:9px;text-align:center;line-height:34px;font-size:18px;margin-bottom:10px;">⚡</div>
            <div style="font-size:13px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">AI Image Grouping</div>
            <div style="font-size:12px;color:#6e6e73;line-height:1.5;">Clusters images by SKU using visual embeddings. No manual sorting.</div>
          </td>
          <td width="2%"></td>
          <td width="49%" valign="top" style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div style="width:34px;height:34px;background:rgba(48,209,88,0.10);border-radius:9px;text-align:center;line-height:34px;font-size:18px;margin-bottom:10px;">🎯</div>
            <div style="font-size:13px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">Angle Detection</div>
            <div style="font-size:12px;color:#6e6e73;line-height:1.5;">Identifies front, back, side and detail shots. Flags missing angles.</div>
          </td>
        </tr>
        <tr><td colspan="3" style="height:10px;"></td></tr>
        <tr>
          <td width="49%" valign="top" style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div style="width:34px;height:34px;background:rgba(255,159,10,0.10);border-radius:9px;text-align:center;line-height:34px;font-size:18px;margin-bottom:10px;">✍️</div>
            <div style="font-size:13px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">AI Copywriting</div>
            <div style="font-size:12px;color:#6e6e73;line-height:1.5;">Generates titles, descriptions and bullet points ready for listing.</div>
          </td>
          <td width="2%"></td>
          <td width="49%" valign="top" style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.07);border-radius:12px;padding:18px;">
            <div style="width:34px;height:34px;background:rgba(175,82,222,0.10);border-radius:9px;text-align:center;line-height:34px;font-size:18px;margin-bottom:10px;">🛍️</div>
            <div style="font-size:13px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">Shopify Upload</div>
            <div style="font-size:12px;color:#6e6e73;line-height:1.5;">Push confirmed products directly to your Shopify store as drafts.</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- SPACER -->
    <tr><td bgcolor="#e8e8ed" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- MARKETPLACES -->
    <tr><td bgcolor="#ffffff" style="padding:24px 32px;text-align:center;border:1px solid rgba(0,0,0,0.08);">
      <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#aeaeb2;">Exports formatted for</p>
      <span style="display:inline-block;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:500;color:#494949;margin:3px;">The Iconic</span>
      <span style="display:inline-block;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:500;color:#494949;margin:3px;">Myer</span>
      <span style="display:inline-block;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:500;color:#494949;margin:3px;">David Jones</span>
      <span style="display:inline-block;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:500;color:#494949;margin:3px;">Shopify</span>
    </td></tr>

    <!-- SPACER -->
    <tr><td bgcolor="#e8e8ed" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- PRICING -->
    <tr><td bgcolor="#ffffff" style="padding:32px;text-align:center;border:1px solid rgba(0,0,0,0.08);">
      <h2 style="margin:0 0 6px;font-size:26px;font-weight:500;letter-spacing:-0.9px;color:#1d1d1f;">Simple pricing.</h2>
      <p style="margin:0 0 26px;font-size:13px;color:#aeaeb2;">Start free. Upgrade when you're ready. Cancel anytime.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr>
          <td width="48%" valign="top" style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.08);border-radius:14px;padding:20px;text-align:left;">
            <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">Starter</div>
            <div style="font-size:32px;font-weight:500;letter-spacing:-1.2px;color:#1d1d1f;line-height:1;margin-bottom:2px;">$79</div>
            <div style="font-size:11px;color:#aeaeb2;margin-bottom:14px;">AUD / month</div>
            <div style="font-size:11px;color:#6e6e73;padding:5px 0;border-top:1px solid rgba(0,0,0,0.05);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>500 images / month</div>
            <div style="font-size:11px;color:#6e6e73;padding:5px 0;border-top:1px solid rgba(0,0,0,0.05);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>2 marketplace exports</div>
            <div style="font-size:11px;color:#6e6e73;padding:5px 0;border-top:1px solid rgba(0,0,0,0.05);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>1 brand &middot; 2 seats</div>
            <div style="font-size:11px;color:#6e6e73;padding:5px 0;border-top:1px solid rgba(0,0,0,0.05);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>Shopify connection</div>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top" bgcolor="#1d1d1f" style="background:#1d1d1f;border-radius:14px;padding:20px;text-align:left;">
            <div style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.65);border-radius:999px;padding:3px 10px;margin-bottom:10px;">Most popular</div>
            <div style="font-size:14px;font-weight:600;color:#f5f5f7;margin-bottom:4px;">Brand</div>
            <div style="font-size:32px;font-weight:500;letter-spacing:-1.2px;color:#f5f5f7;line-height:1;margin-bottom:2px;">$199</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:14px;">AUD / month</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);padding:5px 0;border-top:1px solid rgba(255,255,255,0.07);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>1,500 images / month</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);padding:5px 0;border-top:1px solid rgba(255,255,255,0.07);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>All 4 marketplaces</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);padding:5px 0;border-top:1px solid rgba(255,255,255,0.07);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>3 brands &middot; 5 seats</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);padding:5px 0;border-top:1px solid rgba(255,255,255,0.07);"><span style="color:#30d158;font-weight:700;margin-right:5px;">&#10003;</span>AI copywriting</div>
          </td>
        </tr>
      </table>
      <a href="https://shotsync.ai/#pricing" style="display:inline-block;background:#1d1d1f;color:#f5f5f7;font-size:14px;font-weight:500;letter-spacing:-0.2px;padding:12px 28px;border-radius:10px;text-decoration:none;">See all plans &rarr;</a>
    </td></tr>

    <!-- SPACER -->
    <tr><td bgcolor="#e8e8ed" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- CTA — clean dark block, no orbs -->
    <tr><td bgcolor="#1d1d1f" style="background:#1d1d1f;padding:52px 40px;text-align:center;border-radius:16px;">
      <h2 style="margin:0 0 12px;font-size:32px;font-weight:500;letter-spacing:-1.2px;color:#f5f5f7;line-height:1.15;">Ready to cut your<br>post-production time in half?</h2>
      <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.45);line-height:1.55;letter-spacing:-0.2px;">Join ecommerce teams using ShotSync.ai to go from<br>raw shoot to marketplace-ready in minutes.</p>
      <a href="https://shotsync.ai/signup" style="display:inline-block;background:#f5f5f7;color:#1d1d1f;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Get started free</a>
      <p style="margin:14px 0 0;font-size:11px;color:rgba(255,255,255,0.22);">No credit card required &middot; Cancel anytime</p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td bgcolor="#e8e8ed" style="padding:24px 32px;text-align:center;">
      <div style="margin-bottom:12px;">
        <a href="https://shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Website</a>
        <a href="https://shotsync.ai/#pricing" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Pricing</a>
        <a href="https://shotsync.ai/privacy" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Privacy</a>
        <a href="https://shotsync.ai/terms" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Terms</a>
        <a href="mailto:hello@shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Contact</a>
      </div>
      <div style="font-size:11px;color:#c7c7cc;line-height:1.7;">
        &copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br>
        <a href="${unsubscribeUrl}" style="color:#aeaeb2;text-decoration:none;">Unsubscribe</a>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>

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

    const body = await req.json() as { subject?: string; preview?: boolean; extraEmails?: string[] }
    const subject = body.subject || 'ShotSync.ai is live — post-production on autopilot'
    const preview = body.preview ?? false
    const extraEmails: string[] = (body.extraEmails ?? [])
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes('@') && e !== ADMIN_EMAIL)

    // Get all users from auth
    const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userEmails = users
      .map((u: { email?: string }) => u.email)
      .filter((e: string | undefined): e is string => !!e && e !== ADMIN_EMAIL)

    // Merge and deduplicate
    const emails = [...new Set([...userEmails, ...extraEmails])]

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
          }).then((r) => {
            if (r.error) throw new Error(r.error.message)
            return r
          })
        )
      )
      results.forEach((r: PromiseSettledResult<unknown>, idx: number) => {
        if (r.status === 'fulfilled') sent++
        else failed.push(batch[idx])
      })
    }

    return NextResponse.json({ sent, failed: failed.length, failedEmails: failed, total: emails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Broadcast failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
