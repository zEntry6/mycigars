/**
 * Open Graph Image Utilities
 * 
 * Helper functions for generating OG images with consistent styling.
 */

/**
 * Wrap text to fit within a maximum width.
 * Returns an array of lines.
 */
export function wrapText(
  text: string,
  maxCharsPerLine: number,
  maxLines: number = 3
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
      
      // Check if we've reached max lines
      if (lines.length >= maxLines - 1) {
        // Add remaining text with ellipsis if needed
        const remaining = words.slice(words.indexOf(word)).join(' ')
        if (remaining.length > maxCharsPerLine) {
          currentLine = remaining.substring(0, maxCharsPerLine - 1) + '…'
        } else {
          currentLine = remaining
        }
        break
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.slice(0, maxLines)
}

/**
 * Format date for OG image display.
 * Returns format like "January 7, 2026"
 */
export function formatOgDate(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * OG Image design constants
 */
export const OG_CONFIG = {
  width: 1200,
  height: 630,
  
  // Colors matching paper aesthetic
  colors: {
    background: '#FFFDF8', // Soft off-white
    text: '#2C2825',       // Dark ink
    textMuted: '#6B6560',  // Muted text
    accent: '#B8860B',     // Dark goldenrod accent
    border: '#E8E4DC',     // Soft border
  },
  
  // Typography settings
  typography: {
    title: {
      size: 56,
      lineHeight: 1.2,
      maxCharsPerLine: 32,
      maxLines: 3,
    },
    siteName: {
      size: 24,
    },
    date: {
      size: 20,
    },
    tagline: {
      size: 28,
      maxCharsPerLine: 45,
      maxLines: 2,
    },
  },
}
