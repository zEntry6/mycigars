/**
 * RSS Feed Route Handler
 * 
 * Generates RSS 2.0 feed at /rss.xml
 * Includes only published posts, sorted by publishedAt desc.
 */

import { getPublishedPosts } from '@/lib/firebase/admin'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo'
import {
  generateRssFeed,
  toRfc822Date,
  markdownToHtml,
} from '@/lib/rss'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch only published posts (already filtered in getPublishedPosts)
    const posts = await getPublishedPosts()

    // Sort by publishedAt desc (with fallback to updatedAt, then createdAt)
    const sortedPosts = posts.sort((a, b) => {
      const dateA = a.publishedAt || a.updatedAt || a.createdAt || new Date(0)
      const dateB = b.publishedAt || b.updatedAt || b.createdAt || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    // Determine lastBuildDate from most recent post or now
    const lastBuildDate = sortedPosts.length > 0
      ? toRfc822Date(sortedPosts[0].publishedAt || sortedPosts[0].updatedAt || sortedPosts[0].createdAt)
      : toRfc822Date(new Date())

    // Generate RSS items from posts
    const items = sortedPosts.map(post => {
      const postUrl = `${SITE_URL}/posts/${post.slug}`
      const pubDate = toRfc822Date(post.publishedAt || post.updatedAt || post.createdAt)
      
      // Use excerpt for description, fallback to truncated content
      const description = post.excerpt || truncateForRss(post.content, 300)
      
      // Convert markdown to HTML for content:encoded
      const contentEncoded = markdownToHtml(post.content)

      return {
        title: post.title,
        link: postUrl,
        guid: postUrl,
        pubDate,
        description,
        contentEncoded,
      }
    })

    // Generate the RSS XML
    const rssXml = generateRssFeed({
      title: SITE_NAME,
      link: SITE_URL,
      description: SITE_DESCRIPTION,
      language: 'en-us',
      lastBuildDate,
      items,
    })

    return new Response(rssXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    
    // Return minimal valid RSS on error
    const errorRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>Feed temporarily unavailable</description>
  </channel>
</rss>`
    
    return new Response(errorRss, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    })
  }
}

/**
 * Truncate content for RSS description.
 * Removes markdown formatting and limits length.
 */
function truncateForRss(content: string, maxLength: number): string {
  if (!content) return ''
  
  // Remove markdown formatting
  const cleanText = content
    .replace(/^#+ .+$/gm, '') // Headers
    .replace(/\*\*|__/g, '') // Bold
    .replace(/\*|_/g, '') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/^>\s*/gm, '') // Blockquotes
    .replace(/^[-*]\s/gm, '') // List items
    .replace(/\n+/g, ' ') // Newlines to spaces
    .trim()
  
  if (cleanText.length <= maxLength) return cleanText
  
  // Truncate at word boundary
  const truncated = cleanText.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
}
