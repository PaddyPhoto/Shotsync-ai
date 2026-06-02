import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about ShotSync — what it is, how it works, how it fits in your tech stack, integrations, privacy, and pricing.',
  alternates: { canonical: 'https://www.shotsync.ai/faq' },
}

const FAQS = [
  {
    category: 'What is ShotSync',
    items: [
      {
        q: 'What is ShotSync?',
        a: 'ShotSync is post-shoot product enrichment automation built for fashion brands. It sits between your photoshoot and your ERP or sales channels — taking a folder of images from a photographer and automatically linking each image to the right product by SKU. It clusters images, generates AI listing copy, and pushes fully enriched product records downstream. A job that takes 2–3 days manually is done in 25 minutes.',
      },
      {
        q: 'Is ShotSync a PIM?',
        a: 'ShotSync is a lightweight enrichment layer, not a full PIM. A PIM (like Salsify or Akeneo) is a permanent system of record — a database where product data lives across its entire lifecycle. ShotSync handles the post-shoot enrichment step: it imports your product data, attaches shoot images, generates copy, and pushes the enriched records back to your ERP or sales channels. Data passes through ShotSync; it lives in your ERP or Shopify. Think of a PIM as a warehouse — ShotSync is the forklift that loads it after every shoot.',
      },
      {
        q: 'How is ShotSync different from Salsify?',
        a: 'Salsify is an enterprise PIM platform costing $40,000–$120,000 per year, built for large teams managing product data across hundreds of retail channels. ShotSync is purpose-built for fashion brands that need post-shoot enrichment automation without the enterprise price tag — starting free. ShotSync sits upstream of a PIM: it enriches product data at the point of shoot delivery and feeds it back into your ERP or directly to your sales channels.',
      },
      {
        q: 'What are the two ways to use ShotSync?',
        a: 'Path A — Small brands or brands without an ERP: ShotSync enriches your products and pushes listings directly to your sales channels. For channels with APIs (Shopify, Cin7), images and copy push automatically. For portals without APIs — like THE ICONIC, Myer, and David Jones seller portals — the ShotSync Chrome extension fills in every listing field for you directly in the browser. Path B — Mid-tier brands with an ERP: ShotSync pushes enriched records back into your ERP (Cin7 or Apparel21). Your ERP then handles all downstream distribution to sales channels through its existing integrations — your operations stack stays completely intact.',
      },
      {
        q: 'Where does ShotSync fit in my tech stack?',
        a: 'ShotSync sits between the photoshoot and everything downstream. It fills the gap between photographer image delivery and live product listing — a step that previously required days of manual work. Full layer order: Photo Studio → ShotSync (enrichment) → ERP such as Cin7 or Apparel21 (for mid-tier brands, who then distribute to all channels) OR direct to channels via API and Chrome extension (for small brands without an ERP).',
      },
      {
        q: 'Who is ShotSync for?',
        a: 'The ideal ShotSync customer is a fashion brand with a small eCommerce team selling across multiple platforms simultaneously — too big for spreadsheets, too small for Salsify. Primary users are eCommerce coordinators, emerging DTC brands on Shopify, and mid-tier wholesale brands selling into THE ICONIC, Myer, or David Jones through Cin7 or Apparel21.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    items: [
      {
        q: 'Do my images leave my computer?',
        a: 'No. The entire workflow — upload, clustering, renaming, resizing, and export — runs inside your browser on your own device. Your images are never uploaded to ShotSync\'s servers.',
      },
      {
        q: 'Does ShotSync have access to our images?',
        a: 'We have no access to your images at any point. Nothing is stored on our servers. We only store your account details (name, email, billing) and your product data (SKUs, listing copy, variant info) — never your shoot files.',
      },
      {
        q: 'What about the AI copywriting feature?',
        a: 'AI copywriting is entirely optional and only triggered when you click "Generate Copy." At that point, the hero image for that SKU is sent to OpenAI\'s API to generate the product title, description and bullets. OpenAI\'s API policy states they do not use API inputs to train their models. If you don\'t use this feature, zero images ever leave your machine.',
      },
      {
        q: 'What happens when I push images to Shopify?',
        a: 'Images go directly from your browser to your own Shopify store. ShotSync\'s servers are not involved — we act as the bridge that formats and names the files, but the transfer is between your device and your store.',
      },
    ],
  },
  {
    category: 'Integrations',
    items: [
      {
        q: 'Do I need to connect Shopify or Cin7 to use ShotSync?',
        a: 'No. Both integrations are optional. You can run a full session without any connected platform — export your processed images as a ZIP or directly to a folder on your computer, then upload manually. Platform connections are only needed if you want to push enriched listings automatically.',
      },
      {
        q: 'Which platforms does ShotSync integrate with?',
        a: 'Shopify and Cin7 Core are live direct integrations — ShotSync imports product data from both and can push fully enriched listings including images, AI-generated copy, and all product attributes back into both. THE ICONIC is supported via the Chrome extension. Apparel21, Myer, and David Jones integrations are in development — the extension bridges the gap for portals in the meantime.',
      },
      {
        q: 'How does the Shopify push work?',
        a: 'Once you\'ve added your Shopify store domain and API access token to your brand settings, ShotSync matches each image cluster to a Shopify product by SKU and uploads the processed images directly. It can also push AI-generated product copy (title, description, bullets) at the same time.',
      },
      {
        q: 'How does the Cin7 integration work?',
        a: 'Connect your Cin7 account in brand settings using your Account ID and Application Key. ShotSync imports your full product catalogue — SKUs, names, categories, colour, composition, and RRP — so every cluster can be matched and enriched automatically. Enriched records are then written back to Cin7 after the shoot session.',
      },
    ],
  },
  {
    category: 'Uploads & Files',
    items: [
      {
        q: 'What image formats are accepted?',
        a: 'JPEG, PNG, WebP, and HEIC/HEIF — up to 25 MB per image. TIFF and RAW files are not supported. Ask your photographer to export as high-quality JPEG before delivery.',
      },
      {
        q: 'Do my images need to be named with SKU codes?',
        a: 'SKU-named filenames unlock the fully automatic workflow — ShotSync reads the filename, extracts the SKU, and links images to the matching product record in your database automatically. If your images use camera-generated names (like IMG_1234), you can still use ShotSync: enable the manual workflow, cluster and name images during your session, and export without DB matching. Both paths are supported.',
      },
      {
        q: 'How many images can I upload per job?',
        a: 'There is no hard limit on upload size — the pipeline runs in your browser so it scales with your device. For very large jobs (1,000+ images), we recommend using Save to Folder export mode rather than ZIP download, as it writes files directly to your disk without loading everything into memory at once.',
      },
      {
        q: 'Does Save to Folder work on all browsers?',
        a: 'Save to Folder uses the File System Access API, which is supported on Chrome and Edge. It is not currently supported in Safari or Firefox. On unsupported browsers, ZIP download is used instead — for large jobs it automatically splits into multiple ZIPs of 2 marketplaces each.',
      },
    ],
  },
  {
    category: 'Chrome Extension',
    items: [
      {
        q: 'What is the ShotSync Chrome extension?',
        a: 'The ShotSync Chrome extension lets small brands push product listings directly to sales channel portals — like THE ICONIC, Myer, and David Jones — without needing an API integration. It\'s the solution for channels that don\'t offer a direct API: once connected, it reads your enriched product data from ShotSync and auto-fills every field in the portal form — title, description, category, sizes, barcodes, and images — in one click.',
      },
      {
        q: 'Who needs the Chrome extension?',
        a: 'The extension is most useful for small brands that sell directly into marketplace portals without an ERP to route their data. Mid-tier brands with Cin7 or Apparel21 typically don\'t need it — their ERP handles channel distribution. But any brand that needs to list on THE ICONIC, Myer, or David Jones without manually copying and pasting data can use the extension regardless of their stack.',
      },
      {
        q: 'How do I install the Chrome extension?',
        a: 'Search for "ShotSync" in the Chrome Web Store and click Add to Chrome. Once installed, the ShotSync icon will appear in your Chrome toolbar. If you don\'t see it, click the puzzle piece icon in the toolbar and pin ShotSync.',
      },
      {
        q: 'How do I connect the extension to my account?',
        a: 'In ShotSync, go to Settings → General and click Generate API Key. Copy the key that appears. Then click the ShotSync extension icon in Chrome, paste the key into the API Key field, enter https://www.shotsync.ai as the URL, and click Connect. You only need to do this once.',
      },
      {
        q: 'How do I push a listing to THE ICONIC?',
        a: 'Make sure your product is ready in ShotSync with images, copy, and variants filled in. Then open THE ICONIC seller portal in Chrome and navigate to Create new listing. Click the ShotSync extension icon, select your product, and click Push to THE ICONIC. The extension fills in all the fields automatically — review and submit.',
      },
      {
        q: 'Which portals does the extension support?',
        a: 'THE ICONIC is fully supported. Myer and David Jones support is coming soon — the extension will show a "coming soon" message on those portals until field mapping is complete.',
      },
      {
        q: 'Does the extension work in other browsers?',
        a: 'Currently Chrome only. Support for Edge (which uses the same extension format) is planned.',
      },
    ],
  },
  {
    category: 'Plans & Billing',
    items: [
      {
        q: 'Can I try ShotSync for free?',
        a: 'Yes. The Free plan lets you process up to 50 SKUs per month with no credit card required. It\'s enough to run a real small shoot and feel the full workflow before upgrading.',
      },
      {
        q: 'Are prices in AUD?',
        a: 'Yes, all prices are in Australian dollars (AUD) and include GST.',
      },
      {
        q: 'Can I cancel at any time?',
        a: 'Yes. You can cancel your subscription at any time from the Billing tab in Settings. You\'ll retain access until the end of your current billing period.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '0 40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,245,247,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>Shot<span style={{ color: '#6e6e73' }}>Sync</span></span>
        </Link>
        <Link href="/login" style={{ background: '#1d1d1f', color: '#f5f5f7', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, letterSpacing: '-.2px', textDecoration: 'none' }}>Sign in</Link>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '72px 40px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '12px' }}>Support</p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, letterSpacing: '-1.5px', color: '#1d1d1f', lineHeight: 1.1, marginBottom: '16px' }}>Frequently asked questions</h1>
        <p style={{ fontSize: '17px', color: '#6e6e73', letterSpacing: '-.2px', lineHeight: 1.5 }}>
          Can&apos;t find what you&apos;re looking for?{' '}
          <a href="mailto:hello@shotsync.ai" style={{ color: '#007aff', textDecoration: 'none' }}>Email us</a>
        </p>
      </div>

      {/* FAQ content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Architecture Diagram */}
        <div style={{ marginBottom: '56px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '16px' }}>How ShotSync fits in your stack</p>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '36px 32px' }}>

            {/* Top — Photo Studio */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '10px', padding: '11px 24px', textAlign: 'center', background: '#f5f5f7' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-.2px' }}>Raw images</p>
              </div>

              <svg width="2" height="28" style={{ display: 'block', overflow: 'visible' }}>
                <line x1="1" y1="0" x2="1" y2="22" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                <polygon points="1,28 -3,18 5,18" fill="rgba(0,0,0,0.2)"/>
              </svg>

              {/* ShotSync node */}
              <div style={{ border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '12px', padding: '18px 24px', textAlign: 'center', background: '#1d1d1f', width: '100%', maxWidth: '420px', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.3px' }}>ShotSync</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Enrichment Layer</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                  {[
                    'Import product data  —  Cin7 / Shopify / CSV',
                    'Auto-cluster & link images by SKU filename',
                    'Generate AI listing copy',
                    'Save enriched product records',
                  ].map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: '5px' }} />
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', letterSpacing: '-.1px', lineHeight: 1.5 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branching connector */}
              <div style={{ position: 'relative', width: '100%', height: '44px', maxWidth: '480px' }}>
                <svg width="100%" height="44" style={{ overflow: 'visible', display: 'block' }}>
                  <line x1="50%" y1="0" x2="50%" y2="22" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                  <line x1="18%" y1="22" x2="82%" y2="22" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5"/>
                  <line x1="18%" y1="22" x2="18%" y2="44" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                  <line x1="82%" y1="22" x2="82%" y2="44" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                </svg>
              </div>

              {/* Two paths */}
              <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-start' }}>

                {/* Path A */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                  <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '9px 14px', textAlign: 'center', background: '#f0f7ff', width: '100%', boxSizing: 'border-box' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0066cc', margin: 0, letterSpacing: '-.1px' }}>Path A — Small brands</p>
                    <p style={{ fontSize: '13px', color: '#4d9fd6', margin: '2px 0 0' }}>No ERP</p>
                  </div>
                  <svg width="2" height="20" style={{ display: 'block', overflow: 'visible' }}>
                    <line x1="1" y1="0" x2="1" y2="14" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                    <polygon points="1,20 -3,10 5,10" fill="rgba(0,0,0,0.2)"/>
                  </svg>
                  <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px 14px', background: '#f5f5f7', width: '100%', boxSizing: 'border-box' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px', letterSpacing: '-.1px' }}>Direct to channels</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#6e6e73', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: '#6e6e73' }}>Shopify — via API</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#6e6e73', flexShrink: 0, marginTop: '4px' }} />
                        <span style={{ fontSize: '13px', color: '#6e6e73' }}>THE ICONIC, Myer, David Jones — via Chrome Extension (no API needed)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Path B */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                  <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '9px 14px', textAlign: 'center', background: '#f0faf5', width: '100%', boxSizing: 'border-box' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a7a4a', margin: 0, letterSpacing: '-.1px' }}>Path B — Mid-tier brands</p>
                    <p style={{ fontSize: '13px', color: '#4daa7a', margin: '2px 0 0' }}>With ERP</p>
                  </div>
                  <svg width="2" height="20" style={{ display: 'block', overflow: 'visible' }}>
                    <line x1="1" y1="0" x2="1" y2="14" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                    <polygon points="1,20 -3,10 5,10" fill="rgba(0,0,0,0.2)"/>
                  </svg>
                  <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px 14px', background: '#f5f5f7', width: '100%', boxSizing: 'border-box' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', margin: '0 0 2px', letterSpacing: '-.1px' }}>ERP — Cin7 or Apparel21</p>
                    <p style={{ fontSize: '13px', color: '#6e6e73', margin: '0 0 8px' }}>System of record</p>
                    <svg width="2" height="16" style={{ display: 'block', margin: '0 auto 6px', overflow: 'visible' }}>
                      <line x1="1" y1="0" x2="1" y2="10" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5"/>
                      <polygon points="1,16 -3,6 5,6" fill="rgba(0,0,0,0.2)"/>
                    </svg>
                    <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '7px 10px', background: '#fff' }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', margin: '0 0 4px' }}>All channels via ERP</p>
                      <p style={{ fontSize: '13px', color: '#6e6e73', margin: 0 }}>Shopify, THE ICONIC, Myer, David Jones — routed through ERP integrations</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* FAQ accordions */}
        {FAQS.map(({ category, items }) => (
          <div key={category} style={{ marginBottom: '48px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aeaeb2', marginBottom: '16px' }}>{category}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {items.map(({ q, a }) => (
                <details key={q} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                  <summary style={{ padding: '18px 22px', fontSize: '15px', fontWeight: 500, color: '#1d1d1f', letterSpacing: '-.2px', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    {q}
                    <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 12 12" fill="none" stroke="#6e6e73" strokeWidth="1.5" width="10" height="10"><path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </summary>
                  <p style={{ padding: '0 22px 18px', fontSize: '14px', color: '#6e6e73', lineHeight: 1.65, letterSpacing: '-.1px', marginTop: '-4px' }}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '13px', color: '#aeaeb2', textDecoration: 'none' }}>← Back to ShotSync</Link>
        <p style={{ fontSize: '13px', color: '#aeaeb2' }}>© 2026 ShotSync.ai</p>
      </footer>
    </div>
  )
}
