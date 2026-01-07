/**
 * RSS Feed Utilities
 * 
 * Helper functions for generating RSS 2.0 XML feeds.
 * Includes XML escaping, date formatting, and markdown-to-HTML conversion.
 */

/**
 * Escape special XML characters to prevent injection and ensure valid XML.
 */
export function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Convert a Date to RFC 822 format for RSS pubDate.
 * Example: "Tue, 07 Jan 2026 12:00:00 GMT"
 */
export function toRfc822Date(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return new Date().toUTCString()
  }
  return date.toUTCString()
}

/**
 * Convert markdown to basic HTML for RSS content:encoded.
 * Handles common markdown patterns safely without raw HTML injection.
 */
export function markdownToHtml(content: string): string {
  if (!content) return ''
  
  let html = content

  // Remove the first h1 if present (usually the title)
  html = html.replace(/^#\s+.+\n+/, '')

  // Code blocks (```code```) - escape content
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${escapeXml(code.trim())}</code></pre>`
  })

  // Inline code (`code`) - escape content
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeXml(code)}</code>`)

  // Headers (h2, h3, h4)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Links - keep href but escape text
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    return `<a href="${escapeXml(href)}">${escapeXml(text)}</a>`
  })

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Paragraphs - wrap text blocks not already wrapped
  const lines = html.split('\n\n')
  html = lines.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    // Don't wrap if already an HTML element
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<p') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<hr')
    ) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  }).join('\n')

  // Clean up list formatting
  html = html.replace(/<\/li>\n<li>/g, '</li><li>')

  return html
}

/**
 * Wrap content in CDATA for safe inclusion in XML.
 * Used for content:encoded to allow HTML without escaping everything.
 */
export function wrapCdata(content: string): string {
  // Escape any existing CDATA end markers to prevent injection
  const safeContent = content.replace(/\]\]>/g, ']]]]><![CDATA[>')
  return `<![CDATA[${safeContent}]]>`
}

interface RssItem {
  title: string
  link: string
  guid: string
  pubDate: string
  description: string
  contentEncoded?: string
}

interface RssChannel {
  title: string
  link: string
  description: string
  language: string
  lastBuildDate: string
  items: RssItem[]
}

/**
 * Generate a complete RSS 2.0 XML document.
 */
export function generateRssFeed(channel: RssChannel): string {
  const itemsXml = channel.items.map(item => {
    const contentEncodedXml = item.contentEncoded
      ? `\n      <content:encoded>${wrapCdata(item.contentEncoded)}</content:encoded>`
      : ''
    
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>${contentEncodedXml}
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>
    <lastBuildDate>${channel.lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(channel.link)}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`
}
