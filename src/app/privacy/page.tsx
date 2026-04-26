import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — ShotSync.ai' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--line)]">
        <Link href="/" className="flex items-center gap-[10px]">
          <img src="/icon.png" alt="ShotSync" style={{ width: '28px', height: '28px', borderRadius: '7px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-.3px', color: '#1d1d1f', fontFamily: "'Inter', sans-serif" }}>
            Shot<span style={{ color: '#6e6e73' }}>Sync</span>
          </span>
        </Link>
      </nav>

      <main className="flex-1 px-8 py-16 max-w-[760px] mx-auto w-full">
        <p className="text-[0.72rem] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-3">Legal</p>
        <h1 className="text-[2rem] font-[800] tracking-[-1px] text-[var(--text)] mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
          Privacy Policy
        </h1>
        <p className="text-[0.8rem] text-[var(--text3)] mb-10">Last updated: April 2026</p>

        <div className="flex flex-col gap-8 text-[0.85rem] text-[var(--text2)] leading-relaxed">
          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">1. Who we are</h2>
            <p>ShotSync.ai is operated by Photoworks Sydney Pty Ltd (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We provide a post-production automation platform for fashion eCommerce brands, accessible at shotsync.ai. For privacy enquiries, contact us at <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">hello@shotsync.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">2. What data we collect</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li><strong>Account data:</strong> name, email address, organisation name, and billing details provided at signup.</li>
              <li><strong>Usage data:</strong> pages visited, features used, export jobs created, and browser/device information collected via server logs.</li>
              <li><strong>Uploaded images:</strong> product images you upload for processing. These are used solely to perform the service and are not shared with third parties.</li>
              <li><strong>Payment data:</strong> handled entirely by Stripe. We do not store card numbers or banking details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">3. How we use your data</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li>To provide, operate, and improve the ShotSync.ai platform.</li>
              <li>To send transactional emails (account creation, billing receipts, onboarding).</li>
              <li>To respond to support requests.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">We do not sell your data to third parties or use uploaded images to train AI models.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">4. How your images are handled</h2>
            <p><strong>Your product images never leave your device during normal use.</strong> ShotSync.ai processes images entirely within your browser — clustering, renaming, resizing, and export packaging all happen locally. Images are stored in your browser&apos;s local storage (IndexedDB) for the duration of your session and are never uploaded to our servers as part of the standard workflow.</p>
            <p className="mt-3">There are two specific exceptions where image data temporarily leaves your device:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside mt-2">
              <li><strong>Background removal</strong> — if you use the background removal feature, a compressed copy of the relevant image is transmitted to an AI processing provider to perform the removal. The image is processed and returned immediately and is not retained by the provider.</li>
              <li><strong>Shopify draft creation</strong> — if you push draft listings directly to Shopify, processed images are temporarily uploaded to a private staging area to generate the required URLs for the Shopify API. These temporary files are deleted immediately after the Shopify upload completes.</li>
            </ul>
            <p className="mt-3">Account data (name, email, organisation, billing history) is stored securely in cloud infrastructure hosted in Australia. We use TLS encryption in transit and encryption at rest for all stored data.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">5. Third-party service providers</h2>
            <p>To operate the platform, we engage third-party service providers who process data on our behalf. We only share data necessary for each provider to perform their specific function and do not authorise any provider to use your data for their own purposes.</p>
            <ul className="flex flex-col gap-2 list-disc list-inside mt-3">
              <li><strong>Cloud infrastructure and hosting</strong> — account data, session data, and application logs are stored and served via cloud hosting providers. Data is stored in Australia where available.</li>
              <li><strong>Payment processing</strong> — billing and subscription payments are handled by a PCI-compliant payment processor. We do not store card numbers or banking details.</li>
              <li><strong>Transactional email</strong> — your email address is shared with an email delivery provider solely to send account and billing notifications.</li>
              <li><strong>AI processing</strong> — where you use AI-powered features (product copy generation, background removal), the minimum necessary data — such as product specifications or a single compressed image — is transmitted to an AI provider to perform the requested task. Images are not retained by the provider or used for model training.</li>
              <li><strong>Error monitoring</strong> — anonymised error and performance data may be shared with an application monitoring service to help us identify and resolve bugs. This may include browser type and general usage context but does not include your images or brand assets.</li>
              <li><strong>Analytics</strong> — anonymised traffic and feature usage data is collected by a web analytics service. This data is not linked to individual accounts and does not include image data.</li>
            </ul>
            <p className="mt-3">A current list of our specific sub-processors is available on request — email <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">hello@shotsync.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">6. Your rights</h2>
            <p>Under Australian Privacy Law and where applicable GDPR, you have the right to access, correct, or delete your personal data. To exercise these rights, email <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">hello@shotsync.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">7. Cookies</h2>
            <p>We use essential session cookies for authentication. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">8. Changes to this policy</h2>
            <p>We may update this policy from time to time. Significant changes will be notified by email. Continued use of the platform after changes constitutes acceptance.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] px-8 py-5 text-[0.75rem] text-[var(--text3)] flex items-center justify-between">
        <span>© 2026 ShotSync.ai</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-[var(--text2)] transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text2)] transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
