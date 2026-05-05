import Link from 'next/link'

export const metadata = { title: 'Terms of Service — ShotSync.ai' }

export default function TermsPage() {
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
        <p className="text-[0.79rem] text-[var(--accent)] uppercase tracking-[0.1em] font-semibold mb-3">Legal</p>
        <h1 className="text-[2rem] font-[800] tracking-[-1px] text-[var(--text)] mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
          Terms of Service
        </h1>
        <p className="text-[0.8rem] text-[var(--text3)] mb-10">Last updated: April 2026</p>

        <div className="flex flex-col gap-8 text-[0.85rem] text-[var(--text2)] leading-relaxed">
          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">1. Acceptance</h2>
            <p>By creating an account or using ShotSync.ai, you agree to these Terms of Service. If you are using ShotSync.ai on behalf of an organisation, you represent that you have authority to bind that organisation. These terms are governed by the laws of New South Wales, Australia.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">2. The service</h2>
            <p>ShotSync.ai provides automated post-production tooling for fashion eCommerce, including image clustering, renaming, and export packaging for marketplace submission. The platform is provided &ldquo;as is&rdquo; during Early Access. Features and pricing may change with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">3. Your account</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>You must not share accounts or allow unauthorised access.</li>
              <li>You must provide accurate information at signup.</li>
              <li>Accounts are for business use only — one organisation per account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">4. Acceptable use</h2>
            <p>You must not use ShotSync.ai to:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside mt-2">
              <li>Upload content you do not own or have rights to process.</li>
              <li>Attempt to reverse-engineer, decompile, disassemble, or otherwise derive the source code, algorithms, or underlying logic of the platform by any means.</li>
              <li>Circumvent plan limits through technical means.</li>
              <li>Scrape, crawl, or systematically extract any data, content, or UI elements from the platform.</li>
              <li>Resell or white-label the service without a written agreement (Scale plan and above includes white-label exports for your own brand assets only).</li>
              <li>Use the service to design, develop, or assist in building a competing product or service.</li>
              <li>Reproduce, screenshot, screen-record, or document the platform&apos;s user interface, workflows, or feature set for competitive analysis or to assist any third party in building a competing product.</li>
              <li>Benchmark or analyse the platform&apos;s methodology, automation logic, or marketplace compliance rules for any purpose other than your own internal use of the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">5. Proprietary methodology and trade secrets</h2>
            <p>ShotSync.ai has developed proprietary and confidential methodology including, but not limited to: image clustering and shot grouping logic, marketplace compliance rules and specifications, file naming and sequencing algorithms, AI prompting strategies, and automated export packaging workflows. This methodology constitutes valuable trade secrets and confidential information of ShotSync.ai.</p>
            <p className="mt-3">By using the service, you agree to:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside mt-2">
              <li>Keep all proprietary methodology, workflows, and platform logic confidential.</li>
              <li>Not disclose, publish, or share any information about the platform&apos;s methodology to any third party, including competitors, investors in competing ventures, or potential competitors.</li>
              <li>Not use knowledge gained from using the platform to replicate, approximate, or assist in building any competing product or service.</li>
              <li>These obligations survive termination of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">6. Intellectual property</h2>
            <p>The ShotSync.ai platform, including its source code, user interface design, visual design, written content, marketplace compliance rules, clustering methodology, naming logic, AI integration, and all related materials are the exclusive intellectual property of ShotSync.ai and are protected by Australian and international copyright law. All rights are reserved.</p>
            <p className="mt-3">You retain all ownership of images and brand assets you upload. By using the service, you grant ShotSync.ai a limited licence to process your content solely to deliver the service. We claim no rights to your output files.</p>
            <p className="mt-3">Nothing in these terms grants you any licence to ShotSync.ai&apos;s intellectual property beyond the right to use the service as described in these terms.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">7. Billing and cancellation</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside">
              <li>Paid plans include a 30-day free trial. Your card is collected at signup and billed automatically at the end of the trial period unless you cancel before the trial ends.</li>
              <li>Paid plans are billed monthly or annually in AUD including GST via Stripe.</li>
              <li>Annual plans are charged upfront and are non-refundable except where required by Australian Consumer Law.</li>
              <li>Monthly plans can be cancelled at any time; access continues until the end of the billing period.</li>
              <li>Background removal is billed separately at $0.16 AUD per image, charged to your account at the end of each billing period.</li>
              <li>Early Access customers lock in their rate — price increases will not apply to active subscriptions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">8. Limitation of liability</h2>
            <p>To the extent permitted by law, ShotSync.ai is not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid us in the 3 months preceding any claim. Nothing limits liability that cannot be excluded under Australian Consumer Law.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">9. Termination</h2>
            <p>We may suspend or terminate accounts that breach these terms, including but not limited to breaches of the acceptable use or proprietary methodology sections. You may close your account at any time from the Settings page. On termination, your data is deleted within 30 days. Confidentiality obligations under section 5 survive termination.</p>
          </section>

          <section>
            <h2 className="text-[1rem] font-semibold text-[var(--text)] mb-3">10. Contact</h2>
            <p>Questions about these terms: <a href="mailto:hello@shotsync.ai" className="text-[var(--accent)] hover:underline">hello@shotsync.ai</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] px-8 py-5 text-[0.82rem] text-[var(--text3)] flex items-center justify-between">
        <span>© 2026 ShotSync.ai</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-[var(--text2)] transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text2)] transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
