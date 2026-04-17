/**
 * Shared email helpers — all transactional emails go through here.
 * Uses Resend with hello@shotsync.ai as the sending address.
 */

const FROM = 'ShotSync <hello@shotsync.ai>'
const REPLY_TO = 'hello@shotsync.ai'
const ADMIN_EMAIL = 'hello@shotsync.ai'

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f5f5f7; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; border: 0.5px solid rgba(0,0,0,0.08); }
    .header { padding: 28px 32px 20px; border-bottom: 0.5px solid rgba(0,0,0,0.06); }
    .logo { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; color: #1d1d1f; }
    .logo span { color: #6e6e73; font-weight: 400; }
    .body { padding: 28px 32px; font-size: 15px; line-height: 1.6; color: #3a3a3c; }
    .body p { margin: 0 0 14px; }
    .body p:last-child { margin-bottom: 0; }
    .btn { display: inline-block; margin: 20px 0; background: #1d1d1f; color: #fff !important; text-decoration: none; padding: 11px 22px; border-radius: 9px; font-size: 14px; font-weight: 500; letter-spacing: -0.2px; }
    .footer { padding: 18px 32px; border-top: 0.5px solid rgba(0,0,0,0.06); font-size: 12px; color: #aeaeb2; }
    .label { display: inline-block; background: rgba(0,122,255,0.08); color: #005fc4; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 5px; margin-bottom: 14px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">Shot<span>Sync</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">© 2026 ShotSync.ai</div>
  </div>
</body>
</html>`
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function welcomeFreeEmail(email: string) {
  return {
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Welcome to ShotSync — you\'re all set',
    html: baseTemplate(`
      <p class="label">Welcome</p>
      <p>Hi there,</p>
      <p>You're now on the ShotSync Free plan. You can process up to 25 images per job and export to 1 marketplace — enough to see exactly how the workflow fits your shoot process.</p>
      <p>When you're ready to process full shoots, upgrading takes seconds.</p>
      <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'}/dashboard">Open your dashboard</a>
      <p>If you have any questions, just reply to this email.</p>
      <p>— The ShotSync team</p>
    `),
  }
}

export function welcomePaidEmail(email: string, planName: string, includesOnboarding: boolean) {
  const onboardingLine = includesOnboarding
    ? `<p>As part of your ${planName} plan, you're entitled to a 1-on-1 onboarding call with our team. Simply reply to this email and we'll get something in the calendar.</p>`
    : ''
  return {
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: `Welcome to ShotSync ${planName} — you're all set`,
    html: baseTemplate(`
      <p class="label">${planName} Plan</p>
      <p>Hi there,</p>
      <p>Your <strong>ShotSync ${planName}</strong> plan is now active. You're ready to start processing full shoots.</p>
      ${onboardingLine}
      <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'}/dashboard">Open your dashboard</a>
      <p>If you have any questions, just reply to this email.</p>
      <p>— The ShotSync team</p>
    `),
  }
}

export function teamInviteEmail(toEmail: string, orgName: string, inviterEmail: string, inviteUrl: string) {
  return {
    from: FROM,
    to: toEmail,
    replyTo: REPLY_TO,
    subject: `You've been invited to join ${orgName} on ShotSync`,
    html: baseTemplate(`
      <p class="label">Team Invite</p>
      <p>Hi there,</p>
      <p><strong>${inviterEmail}</strong> has invited you to join <strong>${orgName}</strong> on ShotSync — a post-production platform for fashion eCommerce.</p>
      <p>Click the button below to accept your invite. The link expires in 7 days.</p>
      <a class="btn" href="${inviteUrl}">Accept invite</a>
      <p style="font-size:13px;color:#aeaeb2;">If you weren't expecting this invite, you can safely ignore this email.</p>
    `),
  }
}

export function paymentFailedEmail(email: string, planName: string) {
  return {
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Action required: payment failed for your ShotSync subscription',
    html: baseTemplate(`
      <p class="label">Payment Failed</p>
      <p>Hi there,</p>
      <p>We weren't able to process the payment for your ShotSync <strong>${planName}</strong> subscription.</p>
      <p>Please update your payment details to keep your account active. If payment isn't resolved within a few days, your account will revert to the Free plan.</p>
      <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shotsync.ai'}/dashboard/settings?tab=billing">Update payment details</a>
      <p>If you need help, just reply to this email.</p>
      <p>— The ShotSync team</p>
    `),
  }
}

export function adminNewSubscriberEmail(customerEmail: string, planName: string, priceAud: number, requiresOnboarding: boolean) {
  return {
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New ${planName} subscriber — ${customerEmail}`,
    html: baseTemplate(`
      <p class="label">New Subscriber</p>
      <p>A new subscriber has upgraded to the <strong>${planName}</strong> plan ($${priceAud} AUD/month).</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      ${requiresOnboarding ? `<p><strong style="color:#c27800;">Action required:</strong> This customer is on the Brand plan and is entitled to an onboarding call — reply to their welcome email to schedule it.</p>` : ''}
    `),
  }
}

// ── Sender ─────────────────────────────────────────────────────────────────────

type EmailPayload = {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send(payload)
}
