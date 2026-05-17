import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about ShotSync — how image grouping works, which marketplaces are supported, Shopify integration, privacy, and pricing.',
  alternates: { canonical: 'https://www.shotsync.ai/faq' },
}

const FAQS = [
  {
    category: 'Privacy & Security',
    items: [
      {
        q: 'Do my images leave my computer?',
        a: 'No. The entire workflow — upload, clustering, renaming, resizing, and export — runs inside your browser on your own device. Your images are never uploaded to ShotSync\'s servers.',
      },
      {
        q: 'Does ShotSync have access to our images?',
        a: 'We have no access to your images at any point. Nothing is stored on our servers. We only store your account details (name, email, billing) — never your shoot files.',
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
        q: 'Do I need to connect Shopify to use ShotSync?',
        a: 'No. Shopify integration is optional. You can upload a CSV style list instead, and export your processed images as a ZIP or directly to a folder on your computer. Shopify connection is only needed if you want to push images directly to product listings.',
      },
      {
        q: 'Which marketplaces are supported?',
        a: 'THE ICONIC, Myer PIM, and David Jones PIM are supported out of the box — including their specific image dimensions, naming conventions, and view requirements. Additional marketplaces can be configured in Settings.',
      },
      {
        q: 'How does the Shopify push work?',
        a: 'Once you\'ve added your Shopify store domain and API access token to your brand settings, ShotSync matches each cluster to a Shopify product by SKU and uploads the processed images directly. It can also push AI-generated product copy (title, description, bullets) at the same time.',
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
    category: 'Plans & Billing',
    items: [
      {
        q: 'Can I try ShotSync for free?',
        a: 'Yes. The Free plan lets you process up to 25 images per job with no credit card required. It\'s a good way to test the workflow before upgrading.',
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
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 40px 100px' }}>
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
