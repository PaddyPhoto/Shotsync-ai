'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'

const CHANNELS = [
  {
    key: 'shopify',
    label: 'Shopify',
    description: 'Direct API integration. Products sync automatically. Real-time inventory updates.',
    dot: '#30d158',
    logo: (
      <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#96BF48"/>
        <path d="M21.5 8.5c-.1 0-2.2-.2-2.2-.2s-1.5-1.5-1.6-1.6c-.2-.2-.5-.1-.6-.1L15.9 7c-.3-.9-1-1.6-1.9-1.6-.1 0-.2 0-.3.1-.3-.4-.6-.6-1-.6-2.4 0-3.6 3-3.9 4.5l-2.1.6c-.6.2-.7.2-.8.8L4.5 24l12.5 2.3 6.8-1.5c0-.1-2.2-16-2.3-16.3zM17.3 7.4l-1.6.5c0-.3 0-.5 0-.8.4 0 .8.1 1.1.4.2-.1.4 0 .5-.1zm-2.1-.7c.3 0 .5.2.7.4l-2.1.6c.3-1.2 1-1.8 1.4-1.8v.8zm-1.7.3c.1 0 .2 0 .3.1-.5.2-1 .5-1.3 1.4l-1.6.5c.3-1 1.1-2 2.6-2z" fill="white" opacity="0.9"/>
      </svg>
    ),
    connected: true,
    status: 'active',
    connectedSince: 'Oct 2024',
    lastSync: '2 min ago',
    productsLive: 5,
    apiType: 'REST API',
    capabilities: ['Products', 'Inventory', 'Orders', 'Pricing'],
  },
  {
    key: 'joor',
    label: 'JOOR',
    description: 'Wholesale platform integration. Push product catalogues and manage B2B orders.',
    dot: '#bf5af2',
    logo: (
      <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#bf5af2"/>
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui">JOOR</text>
      </svg>
    ),
    connected: true,
    status: 'active',
    connectedSince: 'Jan 2025',
    lastSync: '15 min ago',
    productsLive: 3,
    apiType: 'REST API',
    capabilities: ['Products', 'Wholesale pricing', 'B2B orders'],
  },
  {
    key: 'iconic',
    label: 'The Iconic',
    description: 'Australia\'s leading fashion marketplace. Listings delivered via product feed in their required format.',
    dot: '#ff9f0a',
    logo: (
      <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#ff9f0a"/>
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="700" fontFamily="system-ui">ICONIC</text>
      </svg>
    ),
    connected: true,
    status: 'active',
    connectedSince: 'Mar 2025',
    lastSync: '1 hour ago',
    productsLive: 3,
    apiType: 'Product Feed',
    capabilities: ['Products', 'Images', 'Inventory feed'],
  },
  {
    key: 'myer',
    label: 'Myer',
    description: 'Department store listings via vendor portal. Automated product data formatting to Myer spec.',
    dot: '#ff3b30',
    logo: (
      <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#ff3b30"/>
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="system-ui">MYER</text>
      </svg>
    ),
    connected: false,
    status: 'disconnected',
    connectedSince: null,
    lastSync: null,
    productsLive: 0,
    apiType: 'Vendor Portal',
    capabilities: ['Products', 'Images', 'Pricing'],
  },
  {
    key: 'dj',
    label: 'David Jones',
    description: 'Premium department store. Listings submitted via EDI/CSV in David Jones brand portal format.',
    dot: '#0a84ff',
    logo: (
      <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#0a84ff"/>
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="system-ui">DJ</text>
      </svg>
    ),
    connected: false,
    status: 'disconnected',
    connectedSince: null,
    lastSync: null,
    productsLive: 0,
    apiType: 'EDI / CSV',
    capabilities: ['Products', 'Images', 'Inventory'],
  },
]

export default function ConnectionsPage() {
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const connected = CHANNELS.filter(c => c.connected)
  const disconnected = CHANNELS.filter(c => !c.connected)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Topbar breadcrumbs={[{ label: 'Connections' }]} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: '4px' }}>Marketplace connections</h1>
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Connect your sales channels. Publish one listing everywhere.</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Connected channels', value: connected.length.toString(), sub: `${disconnected.length} available to connect` },
            { label: 'Products live', value: '11', sub: 'across all channels' },
            { label: 'Last sync', value: '2m', sub: 'Shopify — all healthy' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Connected channels */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Connected — {connected.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {connected.map(ch => (
              <div
                key={ch.key}
                style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px 20px', display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: '16px', alignItems: 'center' }}
              >
                {/* Logo */}
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ch.logo}
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>{ch.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: '#30d158', background: 'rgba(48,209,88,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30d158', display: 'inline-block' }} />
                      Connected
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: '20px' }}>{ch.apiType}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px', lineHeight: 1.5 }}>{ch.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      <span style={{ color: 'var(--text2)' }}>{ch.productsLive}</span> products live
                    </span>
                    {ch.lastSync && (
                      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                        Last sync <span style={{ color: 'var(--text2)' }}>{ch.lastSync}</span>
                      </span>
                    )}
                    {ch.connectedSince && (
                      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                        Since <span style={{ color: 'var(--text2)' }}>{ch.connectedSince}</span>
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {ch.capabilities.map(cap => (
                        <span key={cap} style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '5px' }}>{cap}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text3)', cursor: 'pointer' }}
                    onClick={() => setDisconnecting(disconnecting === ch.key ? null : ch.key)}
                  >
                    Settings
                  </button>
                  <button
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, background: 'transparent', border: '0.5px solid rgba(255,59,48,0.3)', color: 'rgba(255,59,48,0.7)', cursor: 'pointer' }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available to connect */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Available — {disconnected.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {disconnected.map(ch => (
              <div
                key={ch.key}
                style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '18px 20px', display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: '16px', alignItems: 'center', opacity: 0.7 }}
              >
                {/* Logo */}
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: 'grayscale(0.3)' }}>
                  {ch.logo}
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>{ch.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '20px' }}>
                      Not connected
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: '20px' }}>{ch.apiType}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px', lineHeight: 1.5 }}>{ch.description}</p>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {ch.capabilities.map(cap => (
                      <span key={cap} style={{ fontSize: '11px', color: 'var(--text3)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '5px' }}>{cap}</span>
                    ))}
                  </div>
                </div>

                {/* Connect button */}
                <button
                  style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '24px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6, margin: 0 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 500 }}>About marketplace connections — </span>
            Shopify and JOOR connect via direct API for real-time sync. The Iconic, Myer and David Jones use automated product feed delivery — ShotSync formats your listing to each retailer's exact specification and submits via their vendor portal. No manual data entry.
          </p>
        </div>

      </div>
    </div>
  )
}
