'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

const BROADCAST_PREVIEW_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ShotSync</title></head><body style="margin:0;padding:0;background:#f0f0f2;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f2"><tr><td align="center" style="padding:32px 16px;"><table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.10);"><tr><td bgcolor="#ffffff" style="padding:18px 32px;border-bottom:1px solid #f0f0f2;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:9px;vertical-align:middle;"><img src="https://www.shotsync.ai/icon.png" width="26" height="26" alt="" style="display:block;border-radius:6px;"></td><td style="vertical-align:middle;"><span style="font-size:16px;font-weight:700;letter-spacing:-0.5px;color:#0a0a0a;">Shot<span style="color:#aeaeb2;font-weight:400;">Sync</span></span></td></tr></table></td></tr><tr><td bgcolor="#0a0a0a" style="padding:56px 40px 52px;text-align:center;"><p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);">Post-production, automated</p><h1 style="margin:0 0 18px;font-size:42px;font-weight:600;letter-spacing:-2px;line-height:1.06;color:#ffffff;">Your shoot is wrapped.<br><span style="color:rgba(255,255,255,0.38);">The work isn&rsquo;t.</span></h1><p style="margin:0 auto 36px;max-width:420px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.5);letter-spacing:-0.2px;">ShotSync renames every image, writes product copy, and publishes directly to your marketplaces &mdash; in the time it used to take just to sort a folder.</p><a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Start free &mdash; 30 days on us</a></td></tr><tr><td bgcolor="#ffffff" style="padding:40px 32px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="44%" style="background:#fafafa;border:1px solid #e8e8ed;border-radius:14px;padding:24px;text-align:center;vertical-align:top;"><div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#aeaeb2;margin-bottom:12px;">Before ShotSync</div><div style="font-size:36px;font-weight:600;letter-spacing:-2px;color:#c7c7cc;line-height:1;margin-bottom:6px;text-decoration:line-through;">2&ndash;3 days</div><div style="font-size:12px;color:#c7c7cc;line-height:1.5;">Renaming, resizing, writing copy, formatting per marketplace</div></td><td width="12%" style="text-align:center;vertical-align:middle;"><div style="font-size:20px;color:#d1d1d6;">&rarr;</div></td><td width="44%" style="background:#0a0a0a;border-radius:14px;padding:24px;text-align:center;vertical-align:top;"><div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:12px;">With ShotSync</div><div style="font-size:36px;font-weight:600;letter-spacing:-2px;color:#ffffff;line-height:1;margin-bottom:6px;">25 min</div><div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5;">Upload, review, export &mdash; done</div></td></tr></table></td></tr><tr><td bgcolor="#ffffff" style="padding:0 32px;"><div style="height:1px;background:#f0f0f2;"></div></td></tr><tr><td bgcolor="#ffffff" style="padding:36px 32px;"><p style="margin:0 0 28px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">How it works</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-bottom:20px;vertical-align:top;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:top;padding-right:16px;"><div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">01</div></td><td style="vertical-align:top;"><div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Upload your shoot folder</div><div style="font-size:13px;color:#6e6e73;line-height:1.5;">Drop in hundreds of images. ShotSync groups them by look, detects angles, and creates a clean review sheet.</div></td></tr></table></td></tr><tr><td style="padding-bottom:20px;vertical-align:top;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:top;padding-right:16px;"><div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">02</div></td><td style="vertical-align:top;"><div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Review, assign SKUs, generate copy</div><div style="font-size:13px;color:#6e6e73;line-height:1.5;">Import your style sheet, confirm looks, and let AI write titles, descriptions and bullets in your brand voice.</div></td></tr></table></td></tr><tr><td style="vertical-align:top;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:top;padding-right:16px;"><div style="width:28px;height:28px;background:#0a0a0a;border-radius:8px;text-align:center;line-height:28px;font-size:11px;font-weight:700;color:#ffffff;">03</div></td><td style="vertical-align:top;"><div style="font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:3px;">Export to every channel at once</div><div style="font-size:13px;color:#6e6e73;line-height:1.5;">Images renamed and resized to spec. Product data formatted. Published to Shopify and sent to your marketplaces &mdash; all in one click.</div></td></tr></table></td></tr></table></td></tr><tr><td bgcolor="#ffffff" style="padding:0 32px;"><div style="height:1px;background:#f0f0f2;"></div></td></tr><tr><td bgcolor="#ffffff" style="padding:32px;"><p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#aeaeb2;">Built for ANZ fashion</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;"><div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">THE ICONIC</div><div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Auto-formatted to spec</div></td><td width="8"></td><td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;"><div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">MYER</div><div style="font-size:11px;color:#aeaeb2;margin-top:1px;">ShotSync export ready</div></td><td width="8"></td><td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;"><div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">DAVID JONES</div><div style="font-size:11px;color:#aeaeb2;margin-top:1px;">ShotSync export ready</div></td></tr><tr><td colspan="5" style="height:8px;"></td></tr><tr><td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;"><div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">SHOPIFY</div><div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Direct publish to store</div></td><td width="8"></td><td style="padding:14px 18px;border:1px solid #e8e8ed;border-radius:10px;vertical-align:middle;"><div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#0a0a0a;">JOOR</div><div style="font-size:11px;color:#aeaeb2;margin-top:1px;">Wholesale ready</div></td><td width="8"></td><td style="padding:14px 18px;border:1px solid rgba(0,0,0,0.04);border-radius:10px;background:#fafafa;vertical-align:middle;"><div style="font-size:12px;font-weight:600;color:#aeaeb2;">+ more</div><div style="font-size:11px;color:#c7c7cc;margin-top:1px;">Custom rules per brand</div></td></tr></table></td></tr><tr><td style="padding:0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0a0a0a" style="padding:48px 40px;text-align:center;border-radius:16px;"><h2 style="margin:0 0 10px;font-size:28px;font-weight:600;letter-spacing:-1.2px;color:#ffffff;line-height:1.2;">Ready to cut post-production<br>from days to minutes?</h2><p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;letter-spacing:-0.1px;">No credit card. No setup fee. Cancel any time.</p><a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:13px 32px;border-radius:10px;text-decoration:none;">Start your free trial</a></td></tr></table></td></tr><tr><td bgcolor="#f0f0f2" style="padding:28px 32px;text-align:center;"><div style="margin-bottom:10px;"><a href="https://www.shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Website</a><a href="https://www.shotsync.ai/#pricing" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Pricing</a><a href="mailto:hello@shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Contact</a></div><div style="font-size:11px;color:#c7c7cc;line-height:1.8;">&copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br><a href="#" style="color:#c7c7cc;text-decoration:underline;">Unsubscribe</a></div></td></tr></table></td></tr></table></body></html>`

const BROADCAST_PREVIEW_HTML_2 = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ShotSync</title></head><body style="margin:0;padding:0;background:#ebebed;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ebebed"><tr><td align="center" style="padding:32px 16px;"><table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.12);"><tr><td bgcolor="#ffffff" style="padding:18px 32px;border-bottom:1px solid #f0f0f2;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:9px;vertical-align:middle;"><img src="https://www.shotsync.ai/icon.png" width="26" height="26" alt="" style="display:block;border-radius:6px;"></td><td style="vertical-align:middle;"><span style="font-size:16px;font-weight:700;letter-spacing:-0.5px;color:#0a0a0a;">Shot<span style="color:#aeaeb2;font-weight:400;">Sync</span></span></td></tr></table></td></tr><tr><td bgcolor="#f5f5f7" style="padding:0;line-height:0;font-size:0;"><img src="https://www.shotsync.ai/email/hero2.jpg" width="680" alt="ShotSync in action" style="display:block;width:100%;max-width:680px;height:auto;"></td></tr><tr><td bgcolor="#ffffff" style="padding:44px 40px 40px;text-align:center;"><h2 style="margin:0 0 12px;font-size:32px;font-weight:600;letter-spacing:-1.4px;line-height:1.15;color:#0a0a0a;">Ready to make your next shoot<br>the fastest one yet?</h2><p style="margin:0 auto 32px;max-width:440px;font-size:15px;line-height:1.65;color:#6e6e73;letter-spacing:-0.1px;">30 days free. No credit card. Set up in minutes &mdash; your brand settings, naming rules and marketplace specs ready from day one.</p><a href="https://www.shotsync.ai/signup" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:-0.3px;padding:14px 36px;border-radius:10px;text-decoration:none;">Start free trial</a></td></tr><tr><td bgcolor="#fafafa" style="padding:24px 32px;border-top:1px solid #f0f0f2;border-bottom:1px solid #f0f0f2;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="text-align:center;vertical-align:middle;"><div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#aeaeb2;margin-bottom:10px;">Exports to</div><div><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#3a3a3c;margin:0 10px;">THE ICONIC</span><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#3a3a3c;margin:0 10px;">MYER</span><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#3a3a3c;margin:0 10px;">DAVID JONES</span><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#3a3a3c;margin:0 10px;">SHOPIFY</span><span style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:#3a3a3c;margin:0 10px;">JOOR</span></div></td></tr></table></td></tr><tr><td bgcolor="#ebebed" style="padding:28px 32px;text-align:center;"><div style="margin-bottom:10px;"><a href="https://www.shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Website</a><a href="https://www.shotsync.ai/#pricing" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Pricing</a><a href="mailto:hello@shotsync.ai" style="font-size:12px;color:#aeaeb2;text-decoration:none;margin:0 8px;">Contact</a></div><div style="font-size:11px;color:#c7c7cc;line-height:1.8;">&copy; 2026 ShotSync.ai &middot; hello@shotsync.ai<br><a href="#" style="color:#c7c7cc;text-decoration:underline;">Unsubscribe</a></div></td></tr></table></td></tr></table></body></html>`

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'job.completed':      { label: 'Job exported',     color: 'var(--accent2)' },
  'plan.upgraded':      { label: 'Plan upgraded',     color: 'var(--accent4)' },
  'plan.changed':       { label: 'Plan changed',      color: 'var(--accent4)' },
  'plan.admin_override':{ label: 'Admin override',    color: 'var(--accent)' },
  'export.started':     { label: 'Export started',    color: 'var(--text3)' },
  'export.failed':      { label: 'Export failed',     color: 'var(--accent3)' },
}

interface ActivityRow {
  id: string
  event: string
  metadata: Record<string, unknown>
  created_at: string
  org_id: string
  org_name: string
  user_email: string | null
}

interface UserRow {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  org_name: string | null
  org_id: string | null
  plan: string
  role: string | null
  job_count: number
}

const PLAN_COLOURS: Record<string, string> = {
  free:       'var(--text3)',
  launch:     'var(--accent2)',
  growth:     'var(--accent)',
  scale:      'var(--accent4)',
  enterprise: 'var(--accent3)',
}

function sydneyTime(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [selectedTemplate, setSelectedTemplate] = useState<1 | 2>(1)
  const [subject, setSubject] = useState("From Shoot to Live Product Listings — ShotSync.ai")
  const [extraEmailsRaw, setExtraEmailsRaw] = useState('')
  const [recipientList, setRecipientList] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; failedEmails: { email: string; reason: string }[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Email card tabs + transactional state
  const [emailTab, setEmailTab] = useState<'broadcast' | 'transactional'>('broadcast')
  const [previewTemplate, setPreviewTemplate] = useState('re-engagement')
  const [transTestEmail, setTransTestEmail] = useState(ADMIN_EMAIL)
  const [previewTestLoading, setPreviewTestLoading] = useState(false)
  const [previewTestResult, setPreviewTestResult] = useState<string | null>(null)

  // Re-engagement automation status
  const [reEngStatus, setReEngStatus] = useState<{
    enabled: boolean
    lastRunAt: string | null
    lastRunResult: { sent: number; skipped: number; total: number } | null
  } | null>(null)
  const [reEngToggleLoading, setReEngToggleLoading] = useState(false)
  const [reEngTriggerLoading, setReEngTriggerLoading] = useState(false)
  const [reEngTriggerResult, setReEngTriggerResult] = useState<string | null>(null)

  // Users state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersFilter, setUsersFilter] = useState('')

  // Activity log state
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityFilter, setActivityFilter] = useState('')

  // Plan override state
  const [planEmail, setPlanEmail] = useState('')
  const [planValue, setPlanValue] = useState('growth')
  const [planLoading, setPlanLoading] = useState(false)
  const [planResult, setPlanResult] = useState<{ orgName: string; previousPlan: string; newPlan: string; email: string } | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (tok: string) => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${tok}` } })
      const json = await res.json()
      if (res.ok) setUsers(json.data ?? [])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const fetchActivity = useCallback(async (tok: string) => {
    setActivityLoading(true)
    try {
      const res = await fetch('/api/admin/activity?limit=200', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const json = await res.json()
      if (res.ok) setActivity(json.data ?? [])
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const fetchReEngStatus = useCallback(async (tok: string) => {
    try {
      const res = await fetch('/api/admin/re-engagement', { headers: { Authorization: `Bearer ${tok}` } })
      if (res.ok) setReEngStatus(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s || s.user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard')
      } else {
        setSession(s)
        fetchUsers(s.access_token)
        fetchActivity(s.access_token)
        fetchReEngStatus(s.access_token)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user.email === ADMIN_EMAIL) setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [router, fetchUsers, fetchActivity, fetchReEngStatus])

  if (!session) return null

  const token = session.access_token

  const extraEmails = extraEmailsRaw
    .split(/[\n,]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'))

  async function loadPreview() {
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmed(false)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: true, extraEmails, template: selectedTemplate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRecipientList(json.emails)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function sendBroadcast() {
    if (!recipientList) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: false, overrideEmails: recipientList, template: selectedTemplate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
      setRecipientList(null)
      setConfirmed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  async function sendTestEmail() {
    setTestLoading(true)
    setTestResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: false, extraEmails: [], testOnly: true, template: selectedTemplate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTestResult(`Test sent to ${ADMIN_EMAIL}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test send failed')
    } finally {
      setTestLoading(false)
    }
  }

  async function toggleReEng() {
    if (!session) return
    setReEngToggleLoading(true)
    try {
      const res = await fetch('/api/admin/re-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'toggle' }),
      })
      if (res.ok) {
        const json = await res.json()
        setReEngStatus(prev => prev ? { ...prev, enabled: json.enabled } : null)
      }
    } finally {
      setReEngToggleLoading(false)
    }
  }

  async function triggerReEng() {
    if (!session) return
    setReEngTriggerLoading(true)
    setReEngTriggerResult(null)
    try {
      const res = await fetch('/api/admin/re-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'trigger' }),
      })
      const json = await res.json()
      if (res.ok && !json.skipped) {
        setReEngTriggerResult(`✓ Done — ${json.sent} sent, ${json.total} users checked`)
        await fetchReEngStatus(session.access_token)
      } else if (json.skipped) {
        setReEngTriggerResult('Automation is paused — enable it first')
      } else {
        setReEngTriggerResult(`✗ ${json.error ?? 'Failed'}`)
      }
    } catch {
      setReEngTriggerResult('✗ Request error')
    } finally {
      setReEngTriggerLoading(false)
    }
  }

  async function applyPlanOverride() {
    setPlanLoading(true)
    setPlanError(null)
    setPlanResult(null)
    try {
      const res = await fetch('/api/admin/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: planEmail.trim(), plan: planValue }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPlanResult(json)
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar breadcrumbs={[{ label: 'Admin' }]} />
      <div style={{ padding: '32px', maxWidth: '1100px', width: '100%' }}>

        {/* Plan Override */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Plan Override</h2>
              <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">Manually set any user's plan — use for free trials, comps, or corrections.</p>
            </div>
          </div>
          <div className="card-body flex flex-col gap-4">

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">User email</label>
                <input
                  className="input"
                  type="email"
                  value={planEmail}
                  onChange={e => { setPlanEmail(e.target.value); setPlanResult(null); setPlanError(null) }}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">Plan</label>
                <select
                  className="input"
                  value={planValue}
                  onChange={e => { setPlanValue(e.target.value); setPlanResult(null) }}
                  style={{ width: '130px' }}
                >
                  <option value="free">Free</option>
                  <option value="launch">Launch</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {planError && (
              <p className="text-[length:var(--font-base)] text-[var(--accent3)] bg-[rgba(255,59,48,0.07)] rounded-[8px] px-3 py-2">{planError}</p>
            )}

            {planResult && (
              <div style={{ background: 'rgba(48,209,88,0.08)', borderRadius: '10px', padding: '14px 16px', border: '0.5px solid rgba(48,209,88,0.2)' }}>
                <p className="text-[length:var(--font-base)] font-[600] text-[var(--accent2)] mb-1">Plan updated</p>
                <p className="text-[length:var(--font-base)] text-[var(--text2)]">
                  <span className="font-mono">{planResult.email}</span> · <span className="font-[500]">{planResult.orgName}</span>
                </p>
                <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">
                  {planResult.previousPlan} → <span className="font-[600] text-[var(--text)]">{planResult.newPlan}</span>
                </p>
              </div>
            )}

            <button
              className="btn btn-primary w-full justify-center"
              onClick={applyPlanOverride}
              disabled={planLoading || !planEmail.trim()}
            >
              {planLoading ? 'Applying…' : `Set to ${planValue} plan`}
            </button>

          </div>
        </div>

        {/* Emails (Broadcast + Transactional) */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Emails</h2>
              <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">Broadcast EDMs and transactional email templates</p>
            </div>
            {/* Segmented tab control */}
            <div className="flex" style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '3px', gap: '2px', border: '0.5px solid var(--line)' }}>
              {(['broadcast', 'transactional'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setEmailTab(tab)}
                  className="text-[length:var(--font-sm)] font-[500] px-3 py-[4px] rounded-[6px] transition-all duration-150 capitalize border-0"
                  style={{
                    background: emailTab === tab ? 'var(--bg2)' : 'transparent',
                    color: emailTab === tab ? 'var(--text)' : 'var(--text3)',
                    boxShadow: emailTab === tab ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {tab === 'broadcast' ? 'Broadcast' : 'Transactional'}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body flex flex-col gap-4">

            {emailTab === 'broadcast' && (<>

              <div>
                <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">Subject line</label>
                <input
                  className="input"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">
                  Additional recipients
                  <span className="text-[var(--text3)] font-normal ml-1">(comma or newline separated — merged with all app users)</span>
                </label>
                <textarea
                  className="input"
                  style={{ minHeight: '90px', resize: 'vertical', fontFamily: 'monospace', fontSize: 'var(--font-sm)' }}
                  value={extraEmailsRaw}
                  onChange={e => setExtraEmailsRaw(e.target.value)}
                  placeholder="jane@example.com, john@example.com"
                />
                {extraEmails.length > 0 && (
                  <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">{extraEmails.length} extra address{extraEmails.length !== 1 ? 'es' : ''} added</p>
                )}
              </div>

              {error && (
                <p className="text-[length:var(--font-base)] text-[var(--accent3)] bg-[rgba(255,59,48,0.07)] rounded-[8px] px-3 py-2">{error}</p>
              )}

              {testResult && (
                <p className="text-[length:var(--font-sm)] text-[var(--accent2)] bg-[rgba(48,209,88,0.08)] rounded-[8px] px-3 py-2">{testResult}</p>
              )}

              {!recipientList && !result && (
                <div className="flex gap-2">
                  <button
                    className="btn flex-1 justify-center"
                    onClick={sendTestEmail}
                    disabled={testLoading || loading || !subject.trim()}
                  >
                    {testLoading ? 'Sending…' : 'Send test to me'}
                  </button>
                  <button
                    className="btn btn-primary flex-1 justify-center"
                    onClick={loadPreview}
                    disabled={loading || testLoading || !subject.trim()}
                  >
                    {loading ? 'Loading…' : 'Load recipients'}
                  </button>
                </div>
              )}

              {recipientList && !result && (
                <div className="flex flex-col gap-3">
                  <div style={{ background: 'var(--bg3)', borderRadius: '10px', border: '0.5px solid var(--line)', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
                      <p className="text-[length:var(--font-sm)] font-[500] text-[var(--text)]">
                        {recipientList.length} recipient{recipientList.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[length:var(--font-sm)] text-[var(--text3)]">Click × to remove</p>
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px 0' }}>
                      {recipientList.map(e => (
                        <div key={e} className="flex items-center justify-between px-4 py-[5px] hover:bg-[var(--bg2)] group">
                          <p className="text-[length:var(--font-sm)] text-[var(--text2)] font-mono truncate flex-1">{e}</p>
                          <button
                            className="text-[var(--text3)] hover:text-[var(--accent3)] ml-3 text-[1rem] leading-none flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setRecipientList(prev => prev ? prev.filter(x => x !== e) : null)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-[length:var(--font-sm)] text-[var(--text2)]">
                      I confirm I want to send this EDM to {recipientList.length} recipient{recipientList.length !== 1 ? 's' : ''}
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary flex-1 justify-center"
                      onClick={sendBroadcast}
                      disabled={loading || !confirmed || recipientList.length === 0}
                    >
                      {loading ? 'Sending…' : `Send to ${recipientList.length}`}
                    </button>
                    <button
                      className="btn flex-1 justify-center"
                      onClick={() => { setRecipientList(null); setConfirmed(false) }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <div style={{ background: 'rgba(48,209,88,0.08)', borderRadius: '10px', padding: '16px', border: '0.5px solid rgba(48,209,88,0.2)' }}>
                  <p className="text-[length:var(--font-md)] font-[600] text-[var(--accent2)] mb-1">Broadcast sent</p>
                  <p className="text-[length:var(--font-sm)] text-[var(--text2)]">
                    ✓ {result.sent} sent · {result.failed} failed · {result.total} total
                  </p>
                  {result.failedEmails.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[length:var(--font-sm)] text-[var(--accent3)] font-[500] mb-1">Failed to send:</p>
                      {result.failedEmails.map(({ email, reason }) => (
                        <div key={email} className="mb-1">
                          <p className="text-[length:var(--font-sm)] text-[var(--accent3)] font-mono">{email}</p>
                          <p className="text-[length:var(--font-sm)] text-[var(--text3)]">{reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="btn mt-3"
                    onClick={() => { setResult(null); setRecipientList(null) }}
                  >
                    Send another
                  </button>
                </div>
              )}

              {/* Template switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTemplate(1)}
                  className={`btn btn-sm flex-1 ${selectedTemplate === 1 ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Template 1 — The Pitch
                </button>
                <button
                  onClick={() => setSelectedTemplate(2)}
                  className={`btn btn-sm flex-1 ${selectedTemplate === 2 ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Template 2 — The Numbers
                </button>
              </div>

              {/* Broadcast email preview */}
              <div style={{ border: '0.5px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={selectedTemplate === 2 ? BROADCAST_PREVIEW_HTML_2 : BROADCAST_PREVIEW_HTML}
                  style={{ width: '100%', height: '520px', border: 'none', background: '#f0f0f2' }}
                  title="Broadcast email preview"
                />
              </div>

            </>)}

            {emailTab === 'transactional' && (<>

              {/* Automation status panel */}
              <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--line)', borderRadius: '12px', padding: '14px 16px' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: reEngStatus?.enabled ? 'var(--accent2)' : 'var(--text3)' }} />
                    <span className="text-[length:var(--font-base)] font-[500] text-[var(--text)]">Re-engagement automation</span>
                    <span
                      className="chip text-[length:var(--font-xs)]"
                      style={{
                        background: reEngStatus?.enabled ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.06)',
                        color: reEngStatus?.enabled ? 'var(--accent2)' : 'var(--text3)',
                      }}
                    >
                      {reEngStatus === null ? '…' : reEngStatus.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={triggerReEng}
                      disabled={reEngTriggerLoading || reEngStatus === null}
                    >
                      {reEngTriggerLoading ? 'Running…' : 'Run now'}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={toggleReEng}
                      disabled={reEngToggleLoading || reEngStatus === null}
                    >
                      {reEngToggleLoading ? '…' : reEngStatus?.enabled ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-5 flex-wrap">
                  <div>
                    <p className="text-[length:var(--font-xs)] text-[var(--text3)] mb-[2px]">Schedule</p>
                    <p className="text-[length:var(--font-sm)] text-[var(--text2)]">Daily at 2am UTC</p>
                  </div>
                  <div>
                    <p className="text-[length:var(--font-xs)] text-[var(--text3)] mb-[2px]">Last run</p>
                    <p className="text-[length:var(--font-sm)] text-[var(--text2)]">
                      {reEngStatus?.lastRunAt ? sydneyTime(reEngStatus.lastRunAt) : 'Never'}
                    </p>
                  </div>
                  {reEngStatus?.lastRunResult && (reEngStatus.lastRunResult.sent > 0 || reEngStatus.lastRunResult.total > 0) && (
                    <div>
                      <p className="text-[length:var(--font-xs)] text-[var(--text3)] mb-[2px]">Last result</p>
                      <p className="text-[length:var(--font-sm)] text-[var(--text2)]">
                        {reEngStatus.lastRunResult.sent} sent · {reEngStatus.lastRunResult.total} users checked
                      </p>
                    </div>
                  )}
                </div>

                {reEngTriggerResult && (
                  <p className={`text-[length:var(--font-sm)] font-[500] mt-3 ${reEngTriggerResult.startsWith('✓') ? 'text-[var(--accent2)]' : 'text-[var(--text3)]'}`}>
                    {reEngTriggerResult}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-[var(--line)]">
                  <p className="text-[length:var(--font-xs)] text-[var(--text3)]">
                    Sequence · inactive 15 days → email 1 · still inactive +15 days → email 2 · still inactive +30 days → email 3 · never again
                  </p>
                </div>
              </div>

              <div style={{ borderTop: '0.5px solid var(--line)', margin: '0 -18px', padding: '0 18px 0' }} />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">Template</label>
                  <select
                    className="input text-[length:var(--font-base)] py-[6px]"
                    value={previewTemplate}
                    onChange={(e) => { setPreviewTemplate(e.target.value); setPreviewTestResult(null) }}
                  >
                    <option value="re-engagement">Re-engagement (inactive users)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[length:var(--font-base)] text-[var(--text2)] mb-[6px] block">Send test to</label>
                  <input
                    className="input text-[length:var(--font-base)] py-[6px]"
                    type="email"
                    value={transTestEmail}
                    onChange={e => { setTransTestEmail(e.target.value); setPreviewTestResult(null) }}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {previewTestResult && (
                <p className={`text-[length:var(--font-sm)] font-[500] ${previewTestResult.startsWith('✓') ? 'text-[var(--accent2)]' : 'text-[var(--accent3)]'}`}>
                  {previewTestResult}
                </p>
              )}

              <button
                className="btn btn-primary w-full justify-center"
                disabled={previewTestLoading || !transTestEmail.trim().includes('@')}
                onClick={async () => {
                  if (!session) return
                  setPreviewTestLoading(true)
                  setPreviewTestResult(null)
                  try {
                    const res = await fetch('/api/admin/send-test-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({ template: previewTemplate, email: transTestEmail.trim() }),
                    })
                    const json = await res.json()
                    setPreviewTestResult(res.ok ? `✓ Sent to ${json.to}` : '✗ Failed to send')
                  } catch {
                    setPreviewTestResult('✗ Request error')
                  } finally {
                    setPreviewTestLoading(false)
                  }
                }}
              >
                {previewTestLoading ? 'Sending…' : 'Send test email'}
              </button>

              {previewTemplate === 're-engagement' && (() => {
                const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><style>body{margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:0.5px solid rgba(0,0,0,0.08)}.header{padding:28px 32px 20px;border-bottom:0.5px solid rgba(0,0,0,0.06)}.logo{font-size:17px;font-weight:600;letter-spacing:-0.3px;color:#1d1d1f}.logo span{color:#6e6e73;font-weight:400}.body{padding:28px 32px;font-size:15px;line-height:1.6;color:#3a3a3c}.body p{margin:0 0 14px}.body p:last-child{margin-bottom:0}.btn{display:inline-block;margin:20px 0;background:#1d1d1f;color:#fff!important;text-decoration:none;padding:11px 22px;border-radius:9px;font-size:14px;font-weight:500;letter-spacing:-0.2px}.footer{padding:18px 32px;border-top:0.5px solid rgba(0,0,0,0.06);font-size:12px;color:#aeaeb2}.label{display:inline-block;background:rgba(0,122,255,0.08);color:#005fc4;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:3px 8px;border-radius:5px;margin-bottom:14px}</style></head><body><div class="wrap"><div class="header"><div class="logo">Shot<span>Sync</span></div></div><div class="body"><p class="label">We miss you</p><p>Hi there,</p><p>It looks like you haven&rsquo;t been on ShotSync in a while. With a new season coming up, it&rsquo;s a great time to get back in and start processing your shoot images.</p><p>Pick up exactly where you left off &mdash; your brand settings, marketplace rules, and naming templates are all saved and ready to go.</p><a class="btn" href="https://shotsync.ai/dashboard">Open ShotSync</a><p>If you have any questions or feedback, just reply to this email &mdash; we&rsquo;d love to hear from you.</p><p>&mdash; The ShotSync team</p></div><div class="footer">&copy; 2026 ShotSync.ai</div></div></body></html>`
                return (
                  <div style={{ border: '0.5px solid var(--line)', borderRadius: '10px', overflow: 'hidden' }}>
                    <iframe
                      srcDoc={html}
                      style={{ width: '100%', height: '460px', border: 'none', background: '#f5f5f7' }}
                      title="Email preview"
                    />
                  </div>
                )
              })()}

            </>)}

          </div>
        </div>

        {/* Users */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Users</h2>
              <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">{users.length} accounts · sorted by last seen · Sydney time</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchUsers(token)} disabled={usersLoading}>
              {usersLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="card-body flex flex-col gap-3">
            <input
              className="input text-[length:var(--font-base)] py-[6px]"
              placeholder="Filter by email, org, or plan…"
              value={usersFilter}
              onChange={(e) => setUsersFilter(e.target.value)}
            />
            {usersLoading ? (
              <p className="text-[length:var(--font-base)] text-[var(--text3)] py-4 text-center">Loading…</p>
            ) : (
              <div className="flex flex-col gap-[2px]">
                {users
                  .filter((u) => {
                    if (!usersFilter.trim()) return true
                    const q = usersFilter.toLowerCase()
                    return (
                      u.email.toLowerCase().includes(q) ||
                      u.org_name?.toLowerCase().includes(q) ||
                      u.plan.toLowerCase().includes(q)
                    )
                  })
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-[10px] rounded-[8px] hover:bg-[var(--bg3)] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[length:var(--font-base)] font-medium text-[var(--text)] truncate">{u.email}</span>
                          <span className="text-[length:var(--font-xs)] font-semibold uppercase tracking-wide px-[6px] py-[1px] rounded-[4px]"
                            style={{ color: PLAN_COLOURS[u.plan] ?? 'var(--text3)', background: `color-mix(in srgb, ${PLAN_COLOURS[u.plan] ?? 'var(--text3)'} 10%, transparent)` }}>
                            {u.plan}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-[2px] flex-wrap">
                          {u.org_name && <span className="text-[length:var(--font-sm)] text-[var(--text3)]">{u.org_name}</span>}
                          <span className="text-[length:var(--font-sm)] text-[var(--text3)]">{u.job_count} job{u.job_count !== 1 ? 's' : ''}</span>
                          <span className="text-[length:var(--font-sm)] text-[var(--text3)]">joined {sydneyTime(u.created_at).split(',')[0]}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[length:var(--font-sm)] text-[var(--text2)]">Last seen</p>
                        <p className="text-[length:var(--font-sm)] text-[var(--text3)]">{sydneyTime(u.last_sign_in_at)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Activity Log</h2>
              <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-1">Last 200 events across all orgs.</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fetchActivity(token)}
              disabled={activityLoading}
            >
              {activityLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="card-body flex flex-col gap-3">
            <input
              className="input text-[length:var(--font-base)] py-[6px]"
              placeholder="Filter by org, email, or event…"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            />
            {activityLoading ? (
              <p className="text-[length:var(--font-base)] text-[var(--text3)] py-4 text-center">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="text-[length:var(--font-base)] text-[var(--text3)] py-4 text-center">No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-[2px]">
                {activity
                  .filter((row) => {
                    if (!activityFilter.trim()) return true
                    const q = activityFilter.toLowerCase()
                    return (
                      row.org_name?.toLowerCase().includes(q) ||
                      row.user_email?.toLowerCase().includes(q) ||
                      row.event.toLowerCase().includes(q) ||
                      JSON.stringify(row.metadata).toLowerCase().includes(q)
                    )
                  })
                  .map((row) => {
                    const ev = EVENT_LABELS[row.event] ?? { label: row.event, color: 'var(--text3)' }
                    const dateStr = new Date(row.created_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: '2-digit' })
                    const timeStr = new Date(row.created_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={row.id} className="flex items-start gap-3 px-3 py-[10px] rounded-[8px] hover:bg-[var(--bg3)] transition-colors">
                        <div className="flex-shrink-0 w-[8px] h-[8px] rounded-full mt-[5px]" style={{ background: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[length:var(--font-sm)] font-[600] text-[var(--text)]">{row.org_name}</span>
                            <span className="text-[length:var(--font-sm)] px-[6px] py-[1px] rounded-[4px]" style={{ background: `color-mix(in srgb, ${ev.color} 12%, transparent)`, color: ev.color }}>{ev.label}</span>
                          </div>
                          {row.user_email && (
                            <p className="text-[length:var(--font-sm)] text-[var(--text3)] font-mono truncate mt-[1px]">{row.user_email}</p>
                          )}
                          {Object.keys(row.metadata).length > 0 && (
                            <p className="text-[length:var(--font-sm)] text-[var(--text3)] mt-[2px] truncate">
                              {row.event === 'job.completed' && `${row.metadata.job_name} · ${row.metadata.cluster_count} SKUs · ${(row.metadata.marketplaces as string[])?.join(', ')}`}
                              {(row.event === 'plan.upgraded' || row.event === 'plan.changed' || row.event === 'plan.admin_override') && `${row.metadata.plan_from ? `${row.metadata.plan_from} → ` : ''}${row.metadata.plan_to}`}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[length:var(--font-sm)] text-[var(--text3)]">{dateStr}</p>
                          <p className="text-[length:var(--font-xs)] text-[var(--text3)] opacity-60">{timeStr}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
