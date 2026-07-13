import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ShotSync — Product Enrichment Workflow Automation for US Fashion Brands',
  description: 'ShotSync automates product enrichment for US fashion brands. Upload shoot images and a product CSV, build enriched SKU clusters, and publish fully enriched listings to Shopify, Cin7, and your ERP — in minutes, not days.',
  keywords: [
    'ShotSync', 'product enrichment automation', 'US fashion brand workflow',
    'fashion ecommerce workflow USA', 'post-shoot product listing', 'SKU enrichment',
    'Shopify product automation', 'Cin7 integration', 'AIMS360 integration',
    'Salsify alternative', 'fashion PIM alternative', 'ecommerce coordinator tools',
    'product listing automation', 'fashion brand workflow', 'shoot to listing automation',
    'REVOLVE supplier', 'Shopbop vendor', 'Nordstrom supplier portal',
    'product enrichment workflow', 'fashion post-production USA',
    'Cin7 product enrichment', 'Cin7 image upload automation',
    'ERP product data automation', 'fashion ERP integration USA',
    'Cin7 fashion brands', 'product data ERP sync', 'Cin7 Shopify workflow',
    'fashion brand ERP automation', 'post-shoot ERP sync',
    'REVOLVE brand portal', 'Nordstrom vendor integration', 'fashion DTC brand tools',
  ],
  alternates: {
    canonical: 'https://www.shotsync.ai/us',
    languages: {
      'en-AU': 'https://www.shotsync.ai',
      'en-US': 'https://www.shotsync.ai/us',
      'x-default': 'https://www.shotsync.ai',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://www.shotsync.ai',
    siteName: 'ShotSync',
    title: 'ShotSync — Product Enrichment Workflow Automation for US Fashion Brands',
    description: 'From photographer delivery to fully enriched product listings — automatically. ShotSync builds enriched SKU clusters and syncs directly to Shopify, Cin7, and your ERP. Built for US fashion brands.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ShotSync — Product Enrichment Workflow Automation for US Fashion Brands',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShotSync — Product Enrichment Workflow Automation for US Fashion Brands',
    description: 'From photographer delivery to fully enriched product listings — automatically. ShotSync builds enriched SKU clusters and syncs directly to Shopify, Cin7, and your ERP. Built for US fashion brands.',
    images: ['/og-image.png'],
  },
}

export default function USLayout({ children }: { children: React.ReactNode }) {
  return children
}
