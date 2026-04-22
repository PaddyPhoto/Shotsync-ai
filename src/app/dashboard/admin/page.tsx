'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'photoworkssydney@gmail.com'

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [subject, setSubject] = useState("ShotSync.ai is live — post-production on autopilot")
  const [extraEmailsRaw, setExtraEmailsRaw] = useState('')
  const [preview, setPreview] = useState<{ count: number; emails: string[]; subject: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; failedEmails: { email: string; reason: string }[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Plan override state
  const [planEmail, setPlanEmail] = useState('')
  const [planValue, setPlanValue] = useState('brand')
  const [planLoading, setPlanLoading] = useState(false)
  const [planResult, setPlanResult] = useState<{ orgName: string; previousPlan: string; newPlan: string; email: string } | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session: s } }) => {
      if (!s || s.user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard')
      } else {
        setSession(s)
      }
    })
  }, [router])

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
        body: JSON.stringify({ subject, preview: true, extraEmails }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPreview(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function sendBroadcast() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, preview: false, extraEmails }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
      setPreview(null)
      setConfirmed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setLoading(false)
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
      <div style={{ padding: '32px', maxWidth: '640px' }}>

        {/* Plan Override */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Plan Override</h2>
              <p className="text-[0.8rem] text-[var(--text3)] mt-1">Manually set any user's plan — use for free trials, comps, or corrections.</p>
            </div>
          </div>
          <div className="card-body flex flex-col gap-4">

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">User email</label>
                <input
                  className="input"
                  type="email"
                  value={planEmail}
                  onChange={e => { setPlanEmail(e.target.value); setPlanResult(null); setPlanError(null) }}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Plan</label>
                <select
                  className="input"
                  value={planValue}
                  onChange={e => { setPlanValue(e.target.value); setPlanResult(null) }}
                  style={{ width: '130px' }}
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="brand">Brand</option>
                  <option value="scale">Scale</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {planError && (
              <p className="text-[0.78rem] text-[var(--accent3)] bg-[rgba(255,59,48,0.07)] rounded-[8px] px-3 py-2">{planError}</p>
            )}

            {planResult && (
              <div style={{ background: 'rgba(48,209,88,0.08)', borderRadius: '10px', padding: '14px 16px', border: '0.5px solid rgba(48,209,88,0.2)' }}>
                <p className="text-[0.85rem] font-[600] text-[var(--accent2)] mb-1">Plan updated</p>
                <p className="text-[0.78rem] text-[var(--text2)]">
                  <span className="font-mono">{planResult.email}</span> · <span className="font-[500]">{planResult.orgName}</span>
                </p>
                <p className="text-[0.75rem] text-[var(--text3)] mt-1">
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

        {/* Broadcast EDM */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <div>
              <h2 className="text-[1rem] font-[600] text-[var(--text)]">Broadcast EDM</h2>
              <p className="text-[0.8rem] text-[var(--text3)] mt-1">Send the ShotSync promotional email to all signed-up users.</p>
            </div>
          </div>
          <div className="card-body flex flex-col gap-4">

            <div>
              <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">Subject line</label>
              <input
                className="input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            <div>
              <label className="text-[0.78rem] text-[var(--text2)] mb-[6px] block">
                Additional recipients
                <span className="text-[var(--text3)] font-normal ml-1">(comma or newline separated — merged with all app users)</span>
              </label>
              <textarea
                className="input"
                style={{ minHeight: '90px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                value={extraEmailsRaw}
                onChange={e => setExtraEmailsRaw(e.target.value)}
                placeholder="jane@example.com, john@example.com"
              />
              {extraEmails.length > 0 && (
                <p className="text-[0.72rem] text-[var(--text3)] mt-1">{extraEmails.length} extra address{extraEmails.length !== 1 ? 'es' : ''} added</p>
              )}
            </div>

            {error && (
              <p className="text-[0.78rem] text-[var(--accent3)] bg-[rgba(255,59,48,0.07)] rounded-[8px] px-3 py-2">{error}</p>
            )}

            {!preview && !result && (
              <button
                className="btn btn-primary w-full justify-center"
                onClick={loadPreview}
                disabled={loading || !subject.trim()}
              >
                {loading ? 'Loading…' : 'Preview recipients'}
              </button>
            )}

            {preview && !result && (
              <div className="flex flex-col gap-3">
                <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '16px', border: '0.5px solid var(--line)' }}>
                  <p className="text-[0.82rem] font-[500] text-[var(--text)] mb-2">
                    This will send to <strong>{preview.count}</strong> users
                  </p>
                  <p className="text-[0.75rem] text-[var(--text3)] mb-2">Sample recipients:</p>
                  {preview.emails.map(e => (
                    <p key={e} className="text-[0.75rem] text-[var(--text2)] font-mono">{e}</p>
                  ))}
                  {preview.count > preview.emails.length && (
                    <p className="text-[0.75rem] text-[var(--text3)] mt-1">+{preview.count - preview.emails.length} more…</p>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-[0.8rem] text-[var(--text2)]">
                    I confirm I want to send this EDM to {preview.count} users
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    className="btn btn-primary flex-1 justify-center"
                    onClick={sendBroadcast}
                    disabled={loading || !confirmed}
                  >
                    {loading ? 'Sending…' : `Send to ${preview.count} users`}
                  </button>
                  <button
                    className="btn flex-1 justify-center"
                    onClick={() => { setPreview(null); setConfirmed(false) }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div style={{ background: 'rgba(48,209,88,0.08)', borderRadius: '10px', padding: '16px', border: '0.5px solid rgba(48,209,88,0.2)' }}>
                <p className="text-[0.9rem] font-[600] text-[var(--accent2)] mb-1">Broadcast sent</p>
                <p className="text-[0.8rem] text-[var(--text2)]">
                  ✓ {result.sent} sent · {result.failed} failed · {result.total} total
                </p>
                {result.failedEmails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.75rem] text-[var(--accent3)] font-[500] mb-1">Failed to send:</p>
                    {result.failedEmails.map(({ email, reason }) => (
                      <div key={email} className="mb-1">
                        <p className="text-[0.73rem] text-[var(--accent3)] font-mono">{email}</p>
                        <p className="text-[0.7rem] text-[var(--text3)]">{reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn mt-3"
                  onClick={() => { setResult(null); setPreview(null) }}
                >
                  Send another
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
