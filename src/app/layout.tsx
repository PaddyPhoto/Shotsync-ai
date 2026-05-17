import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.shotsync.ai'),
  title: {
    default: 'ShotSync — Fashion Post-Production Automation Tool',
    template: '%s | ShotSync',
  },
  description: 'ShotSync automates fashion eCommerce post-production. Sort shoot images by product, rename files by SKU, label shot angles, and export to Shopify, THE ICONIC, Myer, and Cin7 — in minutes, not hours.',
  keywords: [
    'Shot Sync', 'ShotSync', 'fashion post-production', 'fashion ecommerce workflow',
    'product image automation', 'SKU image naming', 'fashion photography workflow',
    'Shopify image upload', 'THE ICONIC integration', 'Myer supplier portal',
    'Cin7 integration', 'fashion image sorting', 'ecommerce product images Australia',
  ],
  alternates: {
    canonical: 'https://www.shotsync.ai',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.shotsync.ai',
    siteName: 'ShotSync',
    title: 'ShotSync — Fashion Post-Production Automation Tool',
    description: 'Sort shoot images by product, rename by SKU, and export to Shopify, THE ICONIC, Myer, and Cin7 — in minutes, not hours.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ShotSync — Fashion Post-Production Automation Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShotSync — Fashion Post-Production Automation Tool',
    description: 'Sort shoot images by product, rename by SKU, and export to Shopify, THE ICONIC, Myer, and Cin7 — in minutes, not hours.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'ShotSync',
              alternateName: 'Shot Sync',
              url: 'https://www.shotsync.ai',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'ShotSync automates fashion eCommerce post-production workflows. Sort shoot images by product, rename files by SKU, label shot angles, and export directly to Shopify, THE ICONIC, Myer, and Cin7.',
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'AUD',
                lowPrice: '0',
                offerCount: 4,
              },
              provider: {
                '@type': 'Organization',
                name: 'ShotSync',
                url: 'https://www.shotsync.ai',
              },
              featureList: [
                'Automatic product image grouping by SKU',
                'Shot angle detection and labelling',
                'Shopify product image upload',
                'THE ICONIC marketplace export',
                'Myer supplier integration',
                'Cin7 integration',
                'AI product copy generation',
                'Bulk SKU image renaming',
              ],
              audience: {
                '@type': 'Audience',
                audienceType: 'Fashion brands, eCommerce managers, photo studios',
              },
            }),
          }}
        />
      </body>
    </html>
  )
}
