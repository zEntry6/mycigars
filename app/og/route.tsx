/**
 * Dynamic OG Image Generator for Homepage
 * 
 * Generates 1200x630 Open Graph image with:
 * - Site name
 * - Tagline
 * - Paper-like aesthetic
 */

import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo'
import { wrapText, OG_CONFIG } from '@/lib/og'

// Use Node.js runtime for consistency
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Wrap tagline for display
    const taglineLines = wrapText(
      SITE_DESCRIPTION,
      OG_CONFIG.typography.tagline.maxCharsPerLine,
      OG_CONFIG.typography.tagline.maxLines
    )

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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

          {/* Decorative element above title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '2px',
                backgroundColor: OG_CONFIG.colors.accent,
                marginRight: '16px',
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: OG_CONFIG.colors.accent,
              }}
            />
            <div
              style={{
                width: '60px',
                height: '2px',
                backgroundColor: OG_CONFIG.colors.accent,
                marginLeft: '16px',
              }}
            />
          </div>

          {/* Site name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: OG_CONFIG.colors.text,
              textAlign: 'center',
              marginBottom: '24px',
              fontStyle: 'italic',
            }}
          >
            {SITE_NAME}
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {taglineLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: OG_CONFIG.typography.tagline.size,
                  color: OG_CONFIG.colors.textMuted,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Decorative element below tagline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '1px',
                backgroundColor: OG_CONFIG.colors.border,
                marginRight: '12px',
              }}
            />
            <div
              style={{
                fontSize: 16,
                color: OG_CONFIG.colors.textMuted,
              }}
            >
              ✦
            </div>
            <div
              style={{
                width: '40px',
                height: '1px',
                backgroundColor: OG_CONFIG.colors.border,
                marginLeft: '12px',
              }}
            />
          </div>

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
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        },
      }
    )
  } catch (error) {
    console.error('Error generating homepage OG image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
