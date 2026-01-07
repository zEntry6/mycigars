import { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/firebase/admin'
import { SITE_URL } from '@/lib/seo'

/**
 * Dynamic sitemap generation
 * 
 * Includes:
 * - Homepage
 * - All published posts with lastModified dates
 * 
 * Only published posts are included (drafts excluded).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all published posts
  const posts = await getPublishedPosts()

  // Generate post URLs with lastModified
  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  return [...staticPages, ...postUrls]
}
