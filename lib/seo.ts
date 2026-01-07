/**
 * SEO Configuration and Utilities
 * 
 * Centralized SEO constants and helper functions for the site.
 */

// Site configuration from environment
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mycigarsstillburns.vercel.app'
export const SITE_NAME = 'My Cigars, Still Burning'
export const SITE_DESCRIPTION = 'A personal publishing platform for thoughts, essays, and ideas.'
export const AUTHOR_NAME = 'faysmokecigars'
export const AUTHOR_URL = `${SITE_URL}`

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 * Useful for generating meta descriptions.
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (!text) return ''
  
  // Remove markdown formatting for cleaner descriptions
  const cleanText = text
    .replace(/#+\s/g, '') // Headers
    .replace(/\*\*|__/g, '') // Bold
    .replace(/\*|_/g, '') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Code
    .replace(/\n+/g, ' ') // Newlines
    .trim()
  
  if (cleanText.length <= maxLength) return cleanText
  
  // Truncate at word boundary
  const truncated = cleanText.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
}

/**
 * Generate canonical URL for a given path
 */
export function getCanonicalUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${cleanPath}`
}

/**
 * Generate JSON-LD structured data for an article/blog post
 */
export function generateArticleJsonLd(article: {
  title: string
  description: string
  slug: string
  publishedAt?: Date | null
  updatedAt?: Date | null
  content?: string
}): string {
  const url = getCanonicalUrl(`/posts/${article.slug}`)
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(article.publishedAt && {
      datePublished: article.publishedAt.toISOString(),
    }),
    ...(article.updatedAt && {
      dateModified: article.updatedAt.toISOString(),
    }),
  }
  
  return JSON.stringify(jsonLd)
}

/**
 * Generate JSON-LD structured data for the website (homepage)
 */
export function generateWebsiteJsonLd(): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
    },
  }
  
  return JSON.stringify(jsonLd)
}
