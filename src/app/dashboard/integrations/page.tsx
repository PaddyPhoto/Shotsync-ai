'use client'

import { Topbar } from '@/components/layout/Topbar'
import { useBrand } from '@/context/BrandContext'
import type { Brand } from '@/lib/brands'

const COMING_SOON_MARKETS = [
  { id: 'iconic',      name: 'THE ICONIC',  api: 'SellerCenter API' },
  { id: 'myer',        name: 'Myer',        api: 'Supplier Portal API' },
  { id: 'david-jones', name: 'David Jones', api: 'Content API' },
]

export default function IntegrationsPage() {
  const { brands } = useBrand()

  return (
    <div>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Integrations' }]} />

      <div className="p-7">
        <div className="mb-7">
          <h1 className="text-[1.6rem] font-[700] tracking-[-0.5px] text-[var(--text)]" style={{ fontFamily: 'var(--font-syne)' }}>Integrations</h1>
          <p className="text-[0.88rem] text-[var(--text2)] mt-[6px]">Manage platform connections for each brand. Connect once and push images directly from any export.</p>
        </div>

        {brands.length === 0 ? (
          <div className="card max-w-[560px]">
            <div className="card-body">
              <p className="text-[0.85rem] text-[var(--text3)]">No brands yet. <a href="/dashboard/brands" className="text-[var(--accent)] hover:underline">Add a brand</a> to configure platform integrations.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-[900px]">
            {brands.map((brand) => (
              <BrandIntegrationCard key={brand.id} brand={brand} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BrandIntegrationCard({ brand }: { brand: Brand }) {
  const connected = !!brand.shopify_authenticated
  const urlSaved = !!brand.shopify_store_url
  const connectedCount = connected ? 1 : 0

  return (
    <div className="card overflow-hidden">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--line)]" style={{ borderLeft: `3px solid ${brand.logo_color}` }}>
        <div className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[0.85rem] font-bold flex-shrink-0" style={{ background: brand.logo_color, color: '#000' }}>
          {brand.brand_code.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.9rem] font-semibold text-[var(--text)] leading-tight">{brand.name}</p>
          <p className="text-[0.82rem] text-[var(--text3)] font-mono">{brand.brand_code}</p>
        </div>
        <span className="text-[0.82rem] text-[var(--text3)]">
          {connectedCount === 0 ? 'No platforms connected' : `${connectedCount} platform connected`}
        </span>
      </div>

      {/* Marketplace grid */}
      <div className="grid grid-cols-4 divide-x divide-[var(--line)]">
        {/* Shopify */}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#96bf48] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M15.337 23.979l7.453-1.61S19.186 5.44 19.163 5.28a.326.326 0 0 0-.32-.28c-.146 0-2.718-.05-2.718-.05s-1.79-1.73-1.99-1.93v20.96zM11.43 6.08S10.64 5.8 9.6 5.8c-1.6 0-1.68.998-1.68 1.25 0 1.37 3.79 1.9 3.79 5.12 0 2.54-1.61 4.17-3.78 4.17-2.6 0-3.93-1.62-3.93-1.62l.7-2.3s1.37 1.17 2.52 1.17c.75 0 1.06-.59 1.06-1.02 0-1.79-3.11-1.87-3.11-4.82 0-2.48 1.79-4.88 5.38-4.88 1.38 0 2.07.4 2.07.4L11.43 6.08z"/>
              </svg>
            </div>
            <span className="text-[0.8rem] font-semibold text-[var(--text)]">Shopify</span>
          </div>

          <div className="flex-1">
            <div className={`flex items-center gap-1.5 text-[0.82rem] font-medium mb-1 ${connected ? 'text-[var(--accent2)]' : urlSaved ? 'text-[#ff9f0a]' : 'text-[var(--text3)]'}`}>
              <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: connected ? 'var(--accent2)' : urlSaved ? '#ff9f0a' : 'var(--bg4)' }} />
              {connected ? 'Connected' : urlSaved ? 'Auth needed' : 'Not connected'}
            </div>
            <p className="text-[0.8rem] text-[var(--text3)] truncate leading-snug">
              {urlSaved ? brand.shopify_store_url : 'No store configured'}
            </p>
          </div>

          <a href="/dashboard/brands" className="btn btn-ghost btn-sm text-[0.82rem] self-start">
            {connected ? 'Manage' : urlSaved ? 'Re-authorise' : 'Connect'}
          </a>
        </div>

        {/* Coming-soon marketplaces */}
        {COMING_SOON_MARKETS.map((market) => (
          <div key={market.id} className="flex flex-col gap-3 p-4 opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[5px] bg-[var(--bg3)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="1.5" y="4.5" width="7" height="4.5" rx="0.8"/><path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5"/></svg>
              </div>
              <span className="text-[0.8rem] font-semibold text-[var(--text)] leading-tight">{market.name}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text3)] mb-1">
                <div className="w-[5px] h-[5px] rounded-full bg-[var(--bg4)] flex-shrink-0" />
                Coming soon
              </div>
              <p className="text-[0.8rem] text-[var(--text3)] leading-snug">{market.api}</p>
            </div>

            <button disabled className="btn btn-ghost btn-sm text-[0.82rem] self-start cursor-not-allowed">Connect</button>
          </div>
        ))}
      </div>
    </div>
  )
}
