/**
 * Table of Contents Utilities
 * 
 * Extracts headings from markdown content and generates
 * stable, unique IDs for anchor links.
 */

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3 | 4
}

/**
 * Generate a URL-safe slug from heading text.
 * Handles non-latin characters by falling back to a hash-based ID.
 */
function slugify(text: string): string {
  // First, try to generate a readable slug
  const slug = text
    .toLowerCase()
    .trim()
    // Remove markdown formatting
    .replace(/\*\*|__|\*|_|`/g, '')
    // Replace spaces and common punctuation with hyphens
    .replace(/[\s\-–—]+/g, '-')
    // Remove characters that aren't alphanumeric, hyphen, or common non-latin
    .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF-]/g, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
  
  // If the slug is empty (all special characters), generate a hash-based ID
  if (!slug) {
    // Simple hash function for fallback
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `heading-${Math.abs(hash).toString(36)}`
  }
  
  return slug
}

/**
 * Extract headings from markdown content.
 * Returns an array of headings with unique IDs.
 * 
 * @param content - Raw markdown content
 * @param levels - Which heading levels to include (default: [2, 3])
 * @returns Array of TocHeading objects
 */
export function extractHeadings(
  content: string,
  levels: number[] = [2, 3]
): TocHeading[] {
  const headings: TocHeading[] = []
  const usedIds = new Map<string, number>()
  
  // Match markdown headings (## Heading, ### Heading, etc.)
  // Supports headings with various content including bold, code, links
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3 | 4
    
    // Skip if this level is not included
    if (!levels.includes(level)) continue
    
    // Clean the heading text (remove markdown formatting for display)
    const rawText = match[2].trim()
    const text = rawText
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1')     // Italic
      .replace(/`([^`]+)`/g, '$1')       // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    
    // Generate base slug
    const baseSlug = slugify(text)
    
    // Handle duplicate IDs by adding suffix
    let id = baseSlug
    const count = usedIds.get(baseSlug) || 0
    if (count > 0) {
      id = `${baseSlug}-${count + 1}`
    }
    usedIds.set(baseSlug, count + 1)
    
    headings.push({ id, text, level })
  }
  
  return headings
}

/**
 * Add IDs to headings in HTML content.
 * Must use the same ID generation logic as extractHeadings.
 * 
 * @param html - HTML content with headings
 * @returns HTML with id attributes added to headings
 */
export function addHeadingIds(html: string): string {
  const usedIds = new Map<string, number>()
  
  // Match h2, h3, h4 tags
  return html.replace(
    /<(h[234])>([^<]+)<\/h[234]>/g,
    (match, tag, content) => {
      const text = content
        .replace(/<[^>]+>/g, '') // Remove any nested HTML
        .trim()
      
      const baseSlug = slugify(text)
      
      // Handle duplicate IDs
      let id = baseSlug
      const count = usedIds.get(baseSlug) || 0
      if (count > 0) {
        id = `${baseSlug}-${count + 1}`
      }
      usedIds.set(baseSlug, count + 1)
      
      return `<${tag} id="${id}">${content}</${tag}>`
    }
  )
}
