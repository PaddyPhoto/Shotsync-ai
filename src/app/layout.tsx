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
    <html lang="en">
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is ShotSync?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'ShotSync is product enrichment workflow automation software for fashion brands. It takes shoot images and a product CSV, matches them to SKUs, builds enriched product clusters, and exports fully enriched listings directly to Shopify and ERP systems like Cin7 and AIMS360.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is ShotSync a PIM?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No. ShotSync is not a PIM. A PIM like Salsify is a system of record that stores and manages product data permanently. ShotSync is a workflow automation tool that transforms raw shoot assets into enriched product listings and feeds them into your ERP or Shopify. Think of a PIM as a warehouse — ShotSync is the forklift that loads it after every shoot.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How is ShotSync different from Salsify?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Salsify is an enterprise PIM platform costing $40,000–$120,000 per year, built for large teams managing product data across hundreds of retail channels. ShotSync is purpose-built for fashion brands that need product enrichment automation without the enterprise price tag — starting free. ShotSync sits upstream of a PIM: it enriches product data at the point of shoot delivery and feeds it into your ERP or Shopify.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What does ShotSync integrate with?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'ShotSync integrates directly with Shopify and Cin7 Core, pushing fully enriched product listings including images, AI-generated copy, and all product attributes directly into both platforms. AIMS360, Apparel21, REVOLVE, Shopbop, and NuORDER integrations are coming soon.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Does ShotSync integrate with Cin7?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. ShotSync has a direct integration with Cin7 Core. After processing your shoot images and product CSV, ShotSync pushes fully enriched product records — including images, AI-generated copy, and all product attributes like colour, material, measurements, and care instructions — directly into Cin7. From there, Cin7 handles downstream distribution to your retail partners and marketplaces.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Does ShotSync work with ERPs?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. ShotSync is designed to integrate with fashion ERPs rather than bypassing them. Brands with an ERP like Cin7 or AIMS360 use ShotSync to enrich product data at the point of shoot delivery, then push it into their ERP. The ERP then handles all downstream distribution — to Shopify, wholesale retailers, and marketplace platforms. This keeps your operations stack intact.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Who is ShotSync for?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'ShotSync is built for eCommerce coordinators, emerging DTC fashion brands, and mid-tier wholesale fashion brands that sell across multiple platforms simultaneously. It replaces the manual 2–3 day post-shoot workflow with an automated pipeline that runs in under 25 minutes.',
                  },
                },
              ],
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
      <body>
        {children}
      </body>
    </html>
  )
}
