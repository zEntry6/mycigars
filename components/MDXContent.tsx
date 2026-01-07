/**
 * MDXContent Component
 * 
 * Renders parsed markdown content with custom styling.
 * Converts markdown to JSX with proper HTML elements.
 */

import { addHeadingIds } from '@/lib/toc'

interface MDXContentProps {
  content: string
}

/**
 * Simple markdown to HTML converter
 * Handles common markdown patterns
 */
function parseMarkdown(content: string): string {
  let html = content

  // Remove the first h1 if present (already shown in header)
  html = html.replace(/^#\s+.+\n+/, '')

  // Code blocks (```code```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="${lang}">${escapeHtml(code.trim())}</code></pre>`
  })

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  
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
  }).join('\n\n')

  // Clean up list formatting
  html = html.replace(/<\/li>\n<li>/g, '</li><li>')
  
  return html
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function MDXContent({ content }: MDXContentProps) {
  // Parse markdown and add IDs to headings for TOC anchor links
  const html = addHeadingIds(parseMarkdown(content))
  
  return (
    <div
      className="prose-paper"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
