import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.shotsync.ai'),
  title: {
    default: 'ShotSync — Product Enrichment Workflow Automation for Fashion Brands',
    template: '%s | ShotSync',
  },
  description: 'ShotSync automates product enrichment for fashion brands. Upload shoot images and a product CSV, build enriched SKU clusters, and publish fully enriched listings to Shopify, Cin7, and your ERP — in minutes, not days.',
  keywords: [
    'ShotSync', 'product enrichment automation', 'fashion ecommerce workflow',
    'post-shoot product listing', 'SKU enrichment', 'fashion product data',
    'Shopify product automation', 'Cin7 integration', 'AIMS360 integration',
    'Salsify alternative', 'fashion PIM alternative', 'ecommerce coordinator tools',
    'product listing automation', 'fashion brand workflow', 'shoot to listing automation',
    'THE ICONIC integration', 'Myer supplier portal', 'David Jones PIM',
    'product enrichment workflow', 'fashion post-production',
    'Cin7 product enrichment', 'Cin7 image upload automation', 'AIMS360 integration',
    'ERP product data automation', 'fashion ERP integration', 'Cin7 fashion brands',
    'product data ERP sync', 'Cin7 Shopify workflow', 'fashion brand ERP automation',
    'post-shoot ERP sync',
  ],
  alternates: {
    canonical: 'https://www.shotsync.ai',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.shotsync.ai',
    siteName: 'ShotSync',
    title: 'ShotSync — Product Enrichment Workflow Automation for Fashion Brands',
    description: 'From photographer delivery to fully enriched product listings — automatically. ShotSync builds enriched SKU clusters and syncs directly to Shopify, Cin7, and your ERP.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ShotSync — Product Enrichment Workflow Automation for Fashion Brands',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShotSync — Product Enrichment Workflow Automation for Fashion Brands',
    description: 'From photographer delivery to fully enriched product listings — automatically. ShotSync builds enriched SKU clusters and syncs directly to Shopify, Cin7, and your ERP.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'ShotSync',
              url: 'https://www.shotsync.ai',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Product enrichment workflow automation software for fashion brands. Automates the pipeline from photographer image delivery to fully enriched product listings in Shopify and ERP systems.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'AUD',
              },
              creator: {
                '@type': 'Organization',
                name: 'ShotSync',
                url: 'https://www.shotsync.ai',
              },
            }),
          }}
        />
      </head>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-DXWDXL7ZDC" strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-DXWDXL7ZDC');
      `}</Script>
      <Script id="linkedin-insight" strategy="afterInteractive">{`
        _linkedin_partner_id = "9409684";
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        (function(l) {
          if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
          window.lintrk.q=[]}
          var s = document.getElementsByTagName("script")[0];
          var b = document.createElement("script");
          b.type = "text/javascript";b.async = true;
          b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
          s.parentNode.insertBefore(b, s);})(window.lintrk);
      `}</Script>
      <body>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }} alt="" src="https://px.ads.linkedin.com/collect/?pid=9409684&fmt=gif" />
        </noscript>
        {children}
      </body>
    </html>
  )
}
