import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/faq', '/privacy', '/terms'],
        disallow: ['/dashboard/', '/api/', '/auth/', '/enter', '/invite/', '/unsubscribe'],
      },
    ],
    sitemap: 'https://www.shotsync.ai/sitemap.xml',
  }
}
