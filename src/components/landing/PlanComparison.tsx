'use client'

/**
 * Full plan comparison table + FAQ + CTA, shown below the pricing cards.
 * Region-aware only in the currency label — the numbers are identical AU/US.
 * All values are pulled from PLANS so this never drifts from what we charge.
 */

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { PLANS, type PlanId } from '@/lib/plans'

const ORDER: PlanId[] = ['free', 'launch', 'growth', 'scale', 'enterprise']
const CHECK = '✓'
const DASH = '—'
const L = (n: number) => (n === -1 ? 'Unlimited' : n.toLocaleString())

type Row = { label: string; note?: string; values: string[] }
type Group = { title: string; rows: Row[] }

function groups(currency: 'AUD' | 'USD'): Group[] {
  const p = (id: PlanId) => PLANS[id]
  const bool = (b: boolean) => (b ? CHECK : DASH)
  return [
    {
      title: 'Volume & limits',
      rows: [
        { label: `Price / month`, note: `${currency} · annual saves ~20%`, values: ORDER.map((id) => (id === 'free' ? '$0' : id === 'enterprise' ? 'Custom' : `$${p(id).priceAud}`)) },
        { label: 'SKUs processed / month', values: ORDER.map((id) => L(p(id).limits.skusPerMonth)) },
        { label: 'Brands', values: ORDER.map((id) => L(p(id).limits.brands)) },
        { label: 'Export destinations', note: 'per export', values: ORDER.map((id) => String(p(id).limits.marketplaces)) },
        { label: 'Shopify store connections', values: ORDER.map((id) => (p(id).limits.shopifyStores === 0 ? DASH : L(p(id).limits.shopifyStores))) },
        { label: 'Exports / month', values: ORDER.map((id) => L(p(id).limits.exportsPerMonth)) },
      ],
    },
    {
      title: 'AI & image editing',
      rows: [
        { label: 'Image adjustments', note: 'exposure, contrast, highlights, white balance, saturation…', values: ORDER.map(() => CHECK) },
        { label: 'AI product copy', note: 'trained on your brand voice', values: ORDER.map((id) => bool(p(id).limits.aiCopy)) },
        { label: 'One-click background removal', note: '+$0.16 / image', values: ORDER.map((id) => bool(p(id).limits.bgRemoval)) },
      ],
    },
    {
      title: 'Workflow & integrations',
      rows: [
        { label: 'Auto clustering, angle detection & renaming', values: ORDER.map(() => CHECK) },
        { label: 'Cloud import (Google Drive, Dropbox, S3)', values: ORDER.map(() => CHECK) },
        { label: 'ZIP / folder / product-data CSV export', values: ORDER.map(() => CHECK) },
        { label: 'Shopify & Cin7 direct push', values: ORDER.map((id) => (id === 'free' ? DASH : CHECK)) },
      ],
    },
    {
      title: 'Support',
      rows: [
        { label: 'Support', values: ['Standard', 'Standard', 'Standard', 'Priority', 'Dedicated CSM'] },
        { label: 'Onboarding & SSO', values: ORDER.map((id) => (id === 'enterprise' ? CHECK : DASH)) },
      ],
    },
  ]
}

function faq(currency: 'AUD' | 'USD') {
  return [
    { q: 'Which plan is right for me?', a: 'Choose based on how many SKUs you process a month and how many brands/stores you run. Emerging brands usually start on Launch; brands doing regular drops who want AI copy and background removal pick Growth; multi-label or high-volume teams choose Scale. Enterprise is unlimited volume with custom terms.' },
    { q: 'How does billing work?', a: `Plans bill monthly or annually (annual saves ~20%) in ${currency}. Upgrade, downgrade or cancel anytime — changes take effect at your next renewal.` },
    { q: 'How much does background removal cost?', a: 'Background removal is available on Growth and above, billed at $0.16 per image on top of your plan — you only pay for images you actually remove the background on. All other adjustments (exposure, contrast, white balance, etc.) are included free on every plan.' },
    { q: 'Is there a free trial?', a: 'Yes — paid plans include a 30-day free trial, and the Free plan lets you try the full workflow (up to 50 SKUs/month) with no card required.' },
    { q: 'What counts as a “SKU processed”?', a: 'One product (one SKU) run through ShotSync in a calendar month — clustered, renamed, enriched and exported. Re-exporting the same SKU later in the month doesn’t count again.' },
    { q: 'Can I change plans later?', a: 'Anytime, from your dashboard. Upgrades apply immediately; downgrades apply at your next renewal.' },
  ]
}

const CTA_HREF = '/signup'

export function PlanComparison({ currency = 'AUD' }: { currency?: 'AUD' | 'USD' }) {
  const [open, setOpen] = useState<number | null>(0)
  const G = groups(currency)
  const F = faq(currency)

  return (
    <section style={{ maxWidth: 1180, margin: '96px auto 0', color: '#1d1d1f' }}>
      <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 600, letterSpacing: '-1px', margin: '0 0 8px' }}>Compare plans</h2>
      <p style={{ fontSize: 15, color: '#6e6e73', margin: '0 0 32px' }}>Every plan includes the full shoot-to-listing workflow. Higher tiers add volume, AI copy and background removal.</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', width: '30%' }}></th>
              {ORDER.map((id) => (
                <th key={id} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>{PLANS[id].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {G.map((group) => (
              <Fragment key={group.title}>
                <tr>
                  <td colSpan={6} style={{ padding: '26px 12px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9296a0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{group.title}</td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '13px 12px', color: '#3a3a3c' }}>
                      {row.label}
                      {row.note && <span style={{ display: 'block', fontSize: 12, color: '#9296a0' }}>{row.note}</span>}
                    </td>
                    {row.values.map((v, i) => (
                      <td key={i} style={{ padding: '13px 12px', color: v === DASH ? '#c7c7cc' : v === CHECK ? '#1a8a35' : '#1d1d1f', fontWeight: v === CHECK || v === DASH ? 400 : 500 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
            {/* CTA row */}
            <tr>
              <td style={{ padding: '24px 12px 0' }}></td>
              {ORDER.map((id) => (
                <td key={id} style={{ padding: '24px 12px 0', verticalAlign: 'top' }}>
                  <Link
                    href={id === 'enterprise' ? 'mailto:hello@shotsync.ai' : id === 'free' ? CTA_HREF : `${CTA_HREF}?plan=${id}`}
                    style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', background: id === 'growth' ? '#1d1d1f' : 'rgba(0,0,0,0.05)', color: id === 'growth' ? '#fff' : '#1d1d1f', border: '0.5px solid rgba(0,0,0,0.08)' }}
                  >
                    {id === 'enterprise' ? 'Contact sales →' : id === 'free' ? 'Start free →' : 'Get started →'}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 600, letterSpacing: '-.8px', margin: '96px 0 24px' }}>Questions &amp; answers</h2>
      <div style={{ maxWidth: 820 }}>
        {F.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#1d1d1f' }}
            >
              {item.q}
              <span style={{ color: '#9296a0', transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>⌄</span>
            </button>
            {open === i && <p style={{ margin: '0 0 20px', fontSize: 14.5, color: '#6e6e73', lineHeight: 1.6, maxWidth: '64ch' }}>{item.a}</p>}
          </div>
        ))}
      </div>

      {/* CTA banner */}
      <div style={{ textAlign: 'center', margin: '96px 0 8px' }}>
        <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 600, letterSpacing: '-1.2px', margin: '0 0 12px' }}>Ready to turn shoots into listings?</h2>
        <p style={{ fontSize: 16, color: '#6e6e73', margin: '0 0 24px' }}>Start free — no card required. Upgrade as you grow.</p>
        <Link href={CTA_HREF} style={{ display: 'inline-block', background: '#1d1d1f', color: '#fff', padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>Get started free →</Link>
      </div>
    </section>
  )
}
