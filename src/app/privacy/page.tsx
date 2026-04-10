import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — ShotSync.ai' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--line)]">
        <Link href="/" className="flex items-center gap-[10px]">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center"
            style={{ background: 'var(--accent-deep)', boxShadow: '0 0 16px rgba(26,79,255,0.4)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-[-0.5px]" style={{ fontFamily: 'var(--font-syne)' }}>
            Shot<span style={{ color: 'var(--accent)' }}>Sync</span><span style={{ color: 'var(--text3)', fontWeight: 300 }}>.ai</span>
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
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">4. Data storage and security</h2>
            <p>Data is stored on Supabase infrastructure hosted in Australia. Uploaded images are stored temporarily for the duration of your session and export job, then deleted. We use industry-standard encryption in transit (TLS) and at rest.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">5. Third-party services</h2>
            <p>We use the following sub-processors:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside mt-2">
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Resend</strong> — transactional email</li>
              <li><strong>Vercel</strong> — hosting and deployment</li>
            </ul>
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
