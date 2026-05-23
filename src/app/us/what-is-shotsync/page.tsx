import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'What is ShotSync? — Product Enrichment Workflow Automation for US Fashion Brands',
  description: 'ShotSync is product enrichment workflow automation software for US fashion brands. It turns photographer image delivery and a product CSV into fully enriched listings in Shopify, Cin7, AIMS360, and US marketplaces — in minutes, not days.',
  alternates: { canonical: 'https://www.shotsync.ai/us/what-is-shotsync' },
  openGraph: {
    title: 'What is ShotSync? — Product Enrichment Workflow Automation for US Fashion Brands',
    description: 'ShotSync turns photographer image delivery and a product CSV into fully enriched product listings in Shopify, Cin7, AIMS360, and US marketplaces — in minutes, not days.',
  },
}

const TD = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
  <td style={{ padding: '14px 16px', fontSize: '14px', color: bold ? '#1d1d1f' : '#4a4a4f', fontWeight: bold ? 500 : 400, borderBottom: '0.5px solid rgba(0,0,0,0.07)', lineHeight: 1.5 }}>{children}</td>
)
const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.1)', background: '#fafafa' }}>{children}</th>
)

export default function WhatIsShotSyncUSPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '0 40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,245,247,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <Link href="/us" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
        </Link>
        <Link href="/signup" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Get started free</Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '72px 40px 120px' }}>

        {/* Header */}
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>Product Overview</p>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#1d1d1f', lineHeight: 1.08, marginBottom: '24px' }}>What is ShotSync?</h1>
        <p style={{ fontSize: '19px', color: '#4a4a4f', lineHeight: 1.6, letterSpacing: '-.2px', marginBottom: '48px', maxWidth: '640px' }}>
          ShotSync is post-shoot product enrichment workflow automation software built specifically for fashion brands. It takes two inputs — a folder of images from a photographer, and a product CSV — and automatically builds fully enriched, publish-ready product listings that push directly into Shopify and ERP systems like Cin7 and AIMS360.
        </p>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '28px 32px', marginBottom: '64px' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', lineHeight: 1.6, marginBottom: '16px' }}>It solves one very specific, very painful moment in the fashion eCommerce workflow:</p>
          <p style={{ fontSize: '17px', color: '#3a3a3c', lineHeight: 1.65, fontStyle: 'italic', borderLeft: '3px solid #1d1d1f', paddingLeft: '20px', margin: 0 }}>
            &ldquo;The photographer just delivered 800 images and I have a CSV with 120 SKUs. How do I turn that into live product listings without spending three days doing it manually?&rdquo;
          </p>
        </div>

        {/* How it works */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '8px' }}>How It Works</h2>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '28px', letterSpacing: '-.1px' }}>Configure ShotSync once for your studio&apos;s workflow. Every future shoot runs automatically.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '64px' }}>
          {[
            ['Set up once', 'Set the number of images per garment, shot sequence, and naming conventions once.'],
            ['Upload', 'Upload the image folder from your photographer alongside your product CSV.'],
            ['Match & cluster', 'ShotSync matches every image to its correct SKU and builds structured product clusters.'],
            ['Enrich', 'Each cluster is enriched with all product data from the CSV — colour, material, measurements, care instructions, country of origin, and more.'],
            ['AI copy', "AI generates product titles, descriptions, and bullet points in your brand's voice."],
            ['Publish', 'Export pushes fully enriched listings to Shopify, Cin7, AIMS360, or your marketplace directly.'],
          ].map(([title, desc], i) => (
            <div key={title} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px 24px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', marginBottom: '4px', letterSpacing: '-.2px' }}>{title}</div>
                <div style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(48,209,88,0.08)', border: '0.5px solid rgba(48,209,88,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '64px', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', fontWeight: 500, color: '#1d1d1f', margin: 0 }}>A job that takes 2–3 days manually is done in 25 minutes.</p>
        </div>

        {/* Two paths */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '8px' }}>Two Ways to Use ShotSync</h2>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '28px', letterSpacing: '-.1px', lineHeight: 1.6 }}>ShotSync works differently depending on whether your brand runs an ERP. Both paths start the same way — a photoshoot and a product CSV. Where the enriched data goes next depends on your setup.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '64px' }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '28px 24px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,122,255,0.1)', color: '#0062cc', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', marginBottom: '16px' }}>Path A</div>
            <h3 style={{ fontSize: '17px', fontWeight: 500, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-.3px' }}>Small brand, no ERP</h3>
            <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '20px' }}>ShotSync is your entire publishing pipeline. No middleware, no ERP. One shoot processed once — enriched listings pushed directly to your Shopify store and US marketplace platforms simultaneously.</p>
            <div style={{ fontSize: '13px', color: '#4a4a4f', lineHeight: 2 }}>
              <div>Photoshoot + Product CSV</div>
              <div style={{ color: '#aeaeb2' }}>↓</div>
              <div style={{ fontWeight: 500 }}>ShotSync</div>
              <div style={{ color: '#aeaeb2' }}>↓</div>
              <div>Shopify · REVOLVE · Shopbop</div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '28px 24px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(48,209,88,0.12)', color: '#1a7a35', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', marginBottom: '16px' }}>Path B</div>
            <h3 style={{ fontSize: '17px', fontWeight: 500, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-.3px' }}>Mid-tier brand with ERP</h3>
            <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6, marginBottom: '20px' }}>ShotSync enriches your ERP. Your ERP handles everything downstream — Shopify, Nordstrom, Macy&apos;s, REVOLVE. Your operations stack stays completely intact. ShotSync never bypasses your ERP.</p>
            <div style={{ fontSize: '13px', color: '#4a4a4f', lineHeight: 2 }}>
              <div>Photoshoot + Product CSV</div>
              <div style={{ color: '#aeaeb2' }}>↓</div>
              <div style={{ fontWeight: 500 }}>ShotSync</div>
              <div style={{ color: '#aeaeb2' }}>↓</div>
              <div>Cin7 / AIMS360</div>
              <div style={{ color: '#aeaeb2' }}>↓</div>
              <div>Shopify · Nordstrom · REVOLVE</div>
            </div>
          </div>
        </div>

        {/* What it is and isn't */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '8px' }}>What ShotSync Is — And Isn&apos;t</h2>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', letterSpacing: '-.1px' }}>Understanding where ShotSync fits in the market.</p>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Tool</TH>
                <TH>What it does</TH>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: 'rgba(48,209,88,0.04)' }}>
                <TD bold>ShotSync</TD>
                <TD>Post-shoot enrichment workflow automation. Transforms raw shoot assets into fully enriched, publish-ready product records. Data passes through it — fast.</TD>
              </tr>
              <tr>
                <TD bold>A PIM (e.g. Salsify, Akeneo)</TD>
                <TD>Product Information Management. A database that stores and manages product data across its entire lifecycle. Data lives in it — ongoing.</TD>
              </tr>
              <tr>
                <TD bold>A DAM</TD>
                <TD>Digital Asset Management. Stores and organises creative assets. Doesn&apos;t enrich or publish them.</TD>
              </tr>
              <tr>
                <TD bold>A retouching tool</TD>
                <TD>Edits images. Doesn&apos;t touch product data, copy, or publishing.</TD>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px 24px', marginBottom: '64px' }}>
          <p style={{ fontSize: '15px', color: '#1d1d1f', margin: '0 0 8px', fontWeight: 500 }}>A PIM is where your product data lives. ShotSync is what gets it there — from the shoot.</p>
          <p style={{ fontSize: '14px', color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>ShotSync is not a system of record. It is a workflow tool — purpose-built for the specific moment between photographer delivery and live product listing. It complements a PIM or ERP; it does not replace one. Enterprise PIM platforms like Salsify cost $40,000–$120,000 per year and require a dedicated team to operate. ShotSync is purpose-built for fashion brands that need product enrichment automation without the enterprise price tag.</p>
        </div>

        {/* Tech stack */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '8px' }}>Where ShotSync Fits in the Tech Stack</h2>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', letterSpacing: '-.1px' }}>ShotSync sits between the photoshoot and the ERP or eCommerce platform. It does not replace any existing system — it fills the gap between them.</p>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '64px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Layer</TH>
                <TH>Tool</TH>
              </tr>
            </thead>
            <tbody>
              {[
                ['Photoshoot', 'Photographer delivers image folder + brand provides product CSV'],
                ['Enrichment', 'ShotSync — this is the gap ShotSync fills'],
                ['ERP / Inventory', 'Cin7, AIMS360 — ShotSync pushes enriched data into these'],
                ['eCommerce', 'Shopify — ShotSync pushes direct for brands without an ERP'],
                ['Marketplaces', 'REVOLVE, Shopbop, Nordstrom — direct (small brands) or via ERP (mid-tier)'],
              ].map(([layer, tool], i) => (
                <tr key={layer} style={{ background: i === 1 ? 'rgba(48,209,88,0.04)' : undefined }}>
                  <TD bold>{layer}</TD>
                  <TD>{tool}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Who it's for */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '8px' }}>Who It&apos;s For</h2>
        <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', letterSpacing: '-.1px' }}>The ideal ShotSync customer is a fashion brand with a small eCommerce team selling across 3–5 platforms simultaneously — too big for spreadsheets, too small for Salsify.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '64px' }}>
          {[
            {
              title: 'eCommerce Coordinators',
              body: 'The primary user. You receive the shoot, match the images, populate the product attributes, write the listings, and push everything live — every season. ShotSync automates the part that takes the longest, so you can focus on what actually needs your judgment.',
            },
            {
              title: 'Emerging DTC Fashion Brands',
              body: 'No ERP, no production team — just a Shopify store and a seasonal shoot. You need enriched listings in Shopify and on REVOLVE or Shopbop without spending three days doing it manually. ShotSync gives a small team the workflow automation of a much larger one. Configure it once, run it every shoot.',
            },
            {
              title: 'Mid-Tier Wholesale Brands',
              body: "Selling into Nordstrom, REVOLVE, or Macy's through AIMS360 or Cin7? ShotSync enriches your product data before it enters the ERP — so what your retail partners receive is already compliant and publish-ready. Your ERP handles all downstream distribution. Your operations stack stays intact.",
            },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#1d1d1f', marginBottom: '8px', letterSpacing: '-.2px' }}>{title}</div>
              <div style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.65 }}>{body}</div>
            </div>
          ))}
        </div>

        {/* Platform integrations */}
        <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#1d1d1f', marginBottom: '24px' }}>Platform Integrations</h2>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '64px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Platform</TH>
                <TH>Type</TH>
                <TH>ShotSync path</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {[
                ['Shopify',   'eCommerce',    'Direct integration',            'Live'],
                ['Cin7 Core', 'ERP',          'Direct integration',            'Live'],
                ['AIMS360',   'ERP (US)',      'Integration in development',    'Soon'],
                ['REVOLVE',   'Marketplace',  'Direct (small brands)',          'Soon'],
                ['Shopbop',   'Marketplace',  'Direct (small brands)',          'Soon'],
                ['Nordstrom', 'Wholesale',    'Via ERP / EDI',                 'Later'],
              ].map(([platform, type, path, status]) => (
                <tr key={platform}>
                  <TD bold>{platform}</TD>
                  <TD>{type}</TD>
                  <TD>{path}</TD>
                  <td style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px', background: status === 'Live' ? 'rgba(48,209,88,0.12)' : 'rgba(0,0,0,0.06)', color: status === 'Live' ? '#1a7a35' : '#6e6e73' }}>{status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div style={{ background: '#1d1d1f', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.8px', color: '#fff', marginBottom: '12px' }}>Ready to see it in action?</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', lineHeight: 1.6 }}>Start free — no credit card required. Process up to 50 SKUs per month on the free plan.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#fff', color: '#1d1d1f', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', letterSpacing: '-.2px' }}>Get started free</Link>
            <Link href="/faq" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', letterSpacing: '-.2px' }}>Read the FAQ</Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/us" style={{ fontSize: '13px', color: '#aeaeb2', textDecoration: 'none' }}>← Back to ShotSync</Link>
        <p style={{ fontSize: '13px', color: '#aeaeb2' }}>© 2026 ShotSync.ai</p>
      </footer>

    </div>
  )
}
