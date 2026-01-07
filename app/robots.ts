import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Dynamic robots.txt generation
 * 
 * - Allows all crawlers
 * - Disallows /admin routes
 * - Points to sitemap
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
