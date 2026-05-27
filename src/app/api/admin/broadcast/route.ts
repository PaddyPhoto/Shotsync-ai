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
<title>ShotSync — Post-production, automated.</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f2;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f2">
<tr><td align="center" style="padding:32px 16px;">

  <table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);">

    <!-- HEADER -->
    <tr><td bgcolor="#ffffff" style="padding:18px 32px;border-bottom:1px solid #f0f0f2;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:9px;vertical-align:middle;">
          <img src="https://www.shotsync.ai/icon.png" width="26" height="26" alt="" style="display:block;border-radius:6px;">
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:16px;font-weight:700;letter-spacing:-0.5px;color:#0a0a0a;">Shot<span style="color:#aeaeb2;font-weight:400;">Sync</span></span>
        </td>
      </tr></table>
    </td></tr>

    <!-- HERO -->
    <tr><td bgcolor="#0a0a0a" style="padding:56px 40px 52px;text-align:center;">
      <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);">Post-production, automated</p>
      <h1 style="margin:0 0 18px;font-size:42px;font-weight:600;letter-spacing:-2px;line-height:1.06;color:#ffffff;">Your shoot is wrapped.<br><span style="color:rgba(255,255,255,0.38);">The work isn&rsquo;t.</span></h1>
      <p style="margin:0 auto 36px;max-width:420px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.5);letter-spacing:-0.2px;">ShotSync renames every image, writes product copy, and publishes directly to your marketplaces — in the time it used to take just to sort a folder.</p>
      <a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Start free — 30 days on us</a>
    </td></tr>

    <!-- TIME COMPARISON -->
    <tr><td bgcolor="#ffffff" style="padding:40px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44%" style="background:#fafafa;border:1px solid #e8e8ed;border-radius:14px;padding:24px;text-align:center;vertical-align:top;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#aeaeb2;margin-bottom:12px;">Before ShotSync</div>
            <div style="font-size:36px;font-weight:600;letter-spacing:-2px;color:#c7c7cc;line-height:1;margin-bottom:6px;text-decoration:line-through;">2&ndash;3 days</div>
            <div style="font-size:12px;color:#c7c7cc;line-height:1.5;">Renaming, resizing, writing copy, formatting per marketplace</div>
          </td>
          <td width="12%" style="text-align:center;vertical-align:middle;">
            <div style="font-size:20px;color:#d1d1d6;">&rarr;</div>
          </td>
          <td width="44%" style="background:#0a0a0a;border-radius:14px;padding:24px;text-align:center;vertical-align:top;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:12px;">With ShotSync</div>
            <div style="font-size:36px;font-weight:600;letter-spacing:-2px;color:#ffffff;line-height:1;margin-bottom:6px;">25 min</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5;">Upload, review, export — done</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- DIVIDER -->
    <tr><td bgcolor="#ffffff" style="padding:0 32px;"><div style="height:1px;background:#f0f0f2;"></div></td></tr>

    <!-- HOW IT WORKS -->
    <tr><td bgcolor="#ffffff" style="padding:36px 32px;">
      <p style="margin:0 0 28px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">How it works</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom:20px;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="vertical-align:top;padding-right:16px;">
                <div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">01</div>
              </td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Upload your shoot folder</div>
                <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Drop in hundreds of images. ShotSync groups them by look, detects angles, and creates a clean review sheet.</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:20px;vertical-align:top;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="vertical-align:top;padding-right:16px;">
                <div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">02</div>
              </td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Review, assign SKUs, generate copy</div>
                <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Import your style sheet, confirm looks, and let AI write titles, descriptions and bullets in your brand voice.</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="vertical-align:top;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="vertical-align:top;padding-right:16px;">
                <div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">03</div>
              </td>
              <td style="vertical-align:top;">
                <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Export to every channel at once</div>
                <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Images renamed and resized to spec. Product data formatted. Published to Shopify and sent to your marketplaces — all in one click.</div>
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- DIVIDER -->
    <tr><td bgcolor="#ffffff" style="padding:0 32px;"><div style="height:1px;background:#f0f0f2;"></div></td></tr>

    <!-- MARKETPLACES -->
    <tr><td bgcolor="#ffffff" style="padding:32px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">Built for ANZ fashion</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">THE ICONIC</div>
            <div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Auto-formatted to spec</div>
          </td>
          <td width="8"></td>
          <td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">MYER</div>
            <div style="font-size:11px;color:#aeaeb2;margin-top:1px;">ShotSync export ready</div>
          </td>
          <td width="8"></td>
          <td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">DAVID JONES</div>
            <div style="font-size:11px;color:#aeaeb2;margin-top:1px;">ShotSync export ready</div>
          </td>
        </tr>
        <tr><td colspan="5" style="height:8px;"></td></tr>
        <tr>
          <td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">SHOPIFY</div>
            <div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Direct publish to store</div>
          </td>
          <td width="8"></td>
          <td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">JOOR</div>
            <div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Wholesale ready</div>
          </td>
          <td width="8"></td>
          <td style="padding:14px 18px;border:1px solid rgba(0,0,0,0.04);border-radius:10px;background:#fafafa;vertical-align:middle;">
            <div style="font-size:12px;font-weight:600;color:#aeaeb2;">+ more</div>
            <div style="font-size:11px;color:#c7c7cc;margin-top:1px;">Custom rules per brand</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td bgcolor="#0a0a0a" style="padding:48px 40px;text-align:center;border-radius:16px;">
          <h2 style="margin:0 0 10px;font-size:28px;font-weight:600;letter-spacing:-1.2px;color:#ffffff;line-height:1.2;">Ready to cut post-production<br>from days to minutes?</h2>
          <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;letter-spacing:-0.1px;">No credit card. No setup fee. Cancel any time.</p>
          <a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Start your free trial</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td bgcolor="#f0f0f2" style="padding:28px 32px;text-align:center;">
      <div style="margin-bottom:10px;">
        <a href="https://www.shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Website</a>
        <a href="https://www.shotsync.ai/#pricing" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Pricing</a>
        <a href="mailto:hello@shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Contact</a>
      </div>
      <div style="font-size:11px;color:#c7c7cc;line-height:1.8;">
        &copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br>
        <a href="${unsubscribeUrl}" style="color:#c7c7cc;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td></tr>

  </table>

</td></tr>
</table>

</body>
</html>`
}

function getEdmHtml2(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShotSync — 25 minutes. Every shoot.</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f2;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f2">
<tr><td align="center" style="padding:32px 16px;">

  <table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);">

    <!-- HEADER -->
    <tr><td bgcolor="#0a0a0a" style="padding:18px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:9px;vertical-align:middle;">
          <img src="https://www.shotsync.ai/icon.png" width="26" height="26" alt="" style="display:block;border-radius:6px;">
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:16px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">Shot<span style="color:rgba(255,255,255,0.4);font-weight:400;">Sync</span></span>
        </td>
      </tr></table>
    </td></tr>

    <!-- HERO IMAGE -->
    <tr><td bgcolor="#0a0a0a" style="padding:0;line-height:0;font-size:0;">
      <img src="https://www.shotsync.ai/email/hero2.jpg" width="680" alt="ShotSync in action" style="display:block;width:100%;max-width:680px;">
    </td></tr>

    <!-- HEADLINE -->
    <tr><td bgcolor="#ffffff" style="padding:44px 40px 32px;text-align:center;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">The numbers don&rsquo;t lie</p>
      <h1 style="margin:0 0 16px;font-size:38px;font-weight:600;letter-spacing:-1.8px;line-height:1.1;color:#0a0a0a;">What used to take 2&ndash;3 days<br>now takes 25 minutes.</h1>
      <p style="margin:0 auto;max-width:460px;font-size:15px;line-height:1.65;color:#6e6e73;letter-spacing:-0.1px;">ShotSync automates the post-shoot workflow that&rsquo;s been stealing time from fashion teams for years. Upload your shoot, confirm the SKUs, export everywhere at once.</p>
    </td></tr>

    <!-- STATS ROW -->
    <tr><td bgcolor="#ffffff" style="padding:0 32px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="text-align:center;padding:24px 16px;background:#fafafa;border:1px solid #e8e8ed;border-radius:12px;">
          <div style="font-size:32px;font-weight:600;letter-spacing:-1.5px;color:#0a0a0a;line-height:1;margin-bottom:6px;">500+</div>
          <div style="font-size:12px;color:#aeaeb2;line-height:1.4;">images per shoot,<br>auto-named</div>
        </td>
        <td width="10"></td>
        <td style="text-align:center;padding:24px 16px;background:#0a0a0a;border-radius:12px;">
          <div style="font-size:32px;font-weight:600;letter-spacing:-1.5px;color:#ffffff;line-height:1;margin-bottom:6px;">25 min</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.4;">upload to export,<br>end-to-end</div>
        </td>
        <td width="10"></td>
        <td style="text-align:center;padding:24px 16px;background:#fafafa;border:1px solid #e8e8ed;border-radius:12px;">
          <div style="font-size:32px;font-weight:600;letter-spacing:-1.5px;color:#0a0a0a;line-height:1;margin-bottom:6px;">1-click</div>
          <div style="font-size:12px;color:#aeaeb2;line-height:1.4;">to every<br>marketplace</div>
        </td>
      </tr></table>
    </td></tr>

    <!-- DIVIDER -->
    <tr><td bgcolor="#ffffff" style="padding:0 32px;"><div style="height:1px;background:#f0f0f2;"></div></td></tr>

    <!-- FEATURES CHECKLIST -->
    <tr><td bgcolor="#ffffff" style="padding:36px 40px;">
      <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">What it does</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-bottom:16px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:1px;">
              <div style="width:20px;height:20px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#ffffff;font-weight:700;">&checkmark;</div>
            </td>
            <td>
              <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:2px;">Auto-rename every file by SKU and angle</div>
              <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Every image named, sorted and formatted to your spec the moment you upload.</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:1px;">
              <div style="width:20px;height:20px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#ffffff;font-weight:700;">&checkmark;</div>
            </td>
            <td>
              <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:2px;">AI product copy in your brand voice</div>
              <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Titles, descriptions and bullet points written instantly — trained on your tone, not a generic template.</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:1px;">
              <div style="width:20px;height:20px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#ffffff;font-weight:700;">&checkmark;</div>
            </td>
            <td>
              <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:2px;">Export to every marketplace at once</div>
              <div style="font-size:13px;color:#6e6e73;line-height:1.5;">THE ICONIC, MYER, David Jones, JOOR, Shopify — all formatted to spec in a single export.</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:1px;">
              <div style="width:20px;height:20px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#ffffff;font-weight:700;">&checkmark;</div>
            </td>
            <td>
              <div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:2px;">Publish direct to Shopify</div>
              <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Images and product data pushed straight to your store — no CSV imports, no copy-paste.</div>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td bgcolor="#0a0a0a" style="padding:48px 40px;text-align:center;border-radius:16px;">
          <h2 style="margin:0 0 10px;font-size:26px;font-weight:600;letter-spacing:-1px;color:#ffffff;line-height:1.2;">30 days free.<br>No credit card needed.</h2>
          <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;">Set up takes minutes. Your next shoot can be processed the same day.</p>
          <a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Start free trial</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td bgcolor="#f0f0f2" style="padding:28px 32px;text-align:center;">
      <div style="margin-bottom:10px;">
        <a href="https://www.shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Website</a>
        <a href="https://www.shotsync.ai/#pricing" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Pricing</a>
        <a href="mailto:hello@shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Contact</a>
      </div>
      <div style="font-size:11px;color:#c7c7cc;line-height:1.8;">
        &copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br>
        <a href="${unsubscribeUrl}" style="color:#c7c7cc;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td></tr>

  </table>

</td></tr>
</table>

</body>
</html>`
}

function getTemplate(template: number, unsubscribeUrl: string): string {
  return template === 2 ? getEdmHtml2(unsubscribeUrl) : getEdmHtml(unsubscribeUrl)
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

    const body = await req.json() as { subject?: string; preview?: boolean; extraEmails?: string[]; overrideEmails?: string[]; testOnly?: boolean; template?: number }
    const subject = body.subject || 'ShotSync.ai is live — post-production on autopilot'
    const tmpl = body.template ?? 1
    const preview = body.preview ?? false
    const testOnly = body.testOnly ?? false
    const overrideEmails: string[] | undefined = body.overrideEmails
    const extraEmails: string[] = (body.extraEmails ?? [])
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes('@'))

    // Test mode — send only to admin
    if (testOnly) {
      if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'
      const r = await resend.emails.send({
        from: 'ShotSync <hello@shotsync.ai>',
        to: ADMIN_EMAIL,
        replyTo: 'hello@shotsync.ai',
        subject: `[TEST] ${subject}`,
        html: getTemplate(tmpl, `${APP_URL}/unsubscribe?email=${encodeURIComponent(ADMIN_EMAIL)}`),
      })
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ sent: 1, failed: 0, failedEmails: [], total: 1 })
    }

    // If caller provides an explicit list (after user edits), use it directly for sending
    if (!preview && overrideEmails) {
      const emails = overrideEmails.filter((e: string) => e.includes('@'))
      if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const BATCH = 50
      let sent = 0
      const failed: { email: string; reason: string }[] = []
      for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH)
        const results = await Promise.allSettled(
          batch.map((email: string) =>
            resend.emails.send({
              from: 'ShotSync <hello@shotsync.ai>',
              to: email,
              replyTo: 'hello@shotsync.ai',
              subject,
              html: getTemplate(tmpl, `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`),
            }).then((r) => { if (r.error) throw new Error(r.error.message); return r })
          )
        )
        results.forEach((r: PromiseSettledResult<unknown>, idx: number) => {
          if (r.status === 'fulfilled') { sent++ }
          else { failed.push({ email: batch[idx], reason: r.status === 'rejected' && r.reason instanceof Error ? r.reason.message : 'Unknown error' }) }
        })
      }
      return NextResponse.json({ sent, failed: failed.length, failedEmails: failed, total: emails.length })
    }

    // Get all users from auth
    const { data: { users }, error } = await service.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userEmails = users
      .map((u: { email?: string }) => u.email)
      .filter((e: string | undefined): e is string => !!e && e !== ADMIN_EMAIL)

    // Filter out unsubscribes
    const { data: unsubData } = await service.from('email_unsubscribes').select('email')
    const unsubSet = new Set((unsubData ?? []).map((r: { email: string }) => r.email.toLowerCase()))

    // Merge, deduplicate, and remove unsubscribes
    const emails = [...new Set([...userEmails, ...extraEmails])].filter(e => !unsubSet.has(e.toLowerCase()))

    if (preview) {
      return NextResponse.json({ count: emails.length, emails, subject })
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
    const failed: { email: string; reason: string }[] = []

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
        if (r.status === 'fulfilled') {
          sent++
        } else {
          const reason = r.status === 'rejected' && r.reason instanceof Error ? r.reason.message : 'Unknown error'
          failed.push({ email: batch[idx], reason })
        }
      })
    }

    return NextResponse.json({ sent, failed: failed.length, failedEmails: failed, total: emails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Broadcast failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
