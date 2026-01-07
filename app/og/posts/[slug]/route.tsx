/**
 * Dynamic OG Image Generator for Posts
 * 
 * Generates 1200x630 Open Graph images with:
 * - Post title (multi-line wrapped)
 * - Publication date
 * - Site branding
 * - Paper-like aesthetic
 */

import { ImageResponse } from 'next/og'
import { getPostBySlug, getPostByOldSlug } from '@/lib/firebase/admin'
import { SITE_NAME } from '@/lib/seo'
import { wrapText, formatOgDate, OG_CONFIG } from '@/lib/og'

// Use Node.js runtime (Firebase Admin SDK doesn't support Edge)
export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{
    slug: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Fetch post by current slug first
    let post = await getPostBySlug(slug)
    
    // If not found, try old slug
    if (!post) {
      post = await getPostByOldSlug(slug)
    }

    // Return 404 if post not found or not published
    if (!post || post.status !== 'published') {
      return new Response('Post not found', { status: 404 })
    }

    // Wrap title text for display
    const titleLines = wrapText(
      post.title,
      OG_CONFIG.typography.title.maxCharsPerLine,
      OG_CONFIG.typography.title.maxLines
    )

    // Format date
    const dateStr = formatOgDate(post.publishedAt || post.updatedAt || post.createdAt)

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: OG_CONFIG.colors.background,
            padding: '60px 80px',
            fontFamily: 'Georgia, serif',
          }}
        >
          {/* Subtle top border accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: `linear-gradient(90deg, ${OG_CONFIG.colors.accent}, ${OG_CONFIG.colors.border})`,
            }}
          />

          {/* Site branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <span
              style={{
                fontSize: OG_CONFIG.typography.siteName.size,
                color: OG_CONFIG.colors.textMuted,
                fontStyle: 'italic',
              }}
            >
              {SITE_NAME}
            </span>
          </div>

          {/* Title area - centered vertically */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {titleLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: OG_CONFIG.typography.title.size,
                  fontWeight: 700,
                  color: OG_CONFIG.colors.text,
                  lineHeight: OG_CONFIG.typography.title.lineHeight,
                  marginBottom: i < titleLines.length - 1 ? '8px' : '0',
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Date at bottom */}
          {dateStr && (
            <div
              style={{
                display: 'flex',
                marginTop: '40px',
              }}
            >
              <span
                style={{
                  fontSize: OG_CONFIG.typography.date.size,
                  color: OG_CONFIG.colors.textMuted,
                }}
              >
                {dateStr}
              </span>
            </div>
          )}

          {/* Subtle paper texture effect via gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      ),
      {
        width: OG_CONFIG.width,
        height: OG_CONFIG.height,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
