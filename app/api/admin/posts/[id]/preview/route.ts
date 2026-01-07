import { NextRequest, NextResponse } from 'next/server'
import { 
  generatePreviewToken, 
  revokePreviewToken,
  getPostPreview,
} from '@/lib/firebase/admin'

/**
 * POST /api/admin/posts/[id]/preview
 * Generate or regenerate a preview token for the post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const result = await generatePreviewToken(id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      token: result.token,
    })
  } catch (error) {
    console.error('Error generating preview token:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview token' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/posts/[id]/preview
 * Revoke the preview token for the post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const result = await revokePreviewToken(id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking preview token:', error)
    return NextResponse.json(
      { error: 'Failed to revoke preview token' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/posts/[id]/preview
 * Get the current preview status for the post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const preview = await getPostPreview(id)
    
    if (!preview) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      preview: {
        token: preview.token,
        enabled: preview.enabled,
        createdAt: preview.createdAt?.toISOString() || null,
      }
    })
  } catch (error) {
    console.error('Error getting preview status:', error)
    return NextResponse.json(
      { error: 'Failed to get preview status' },
      { status: 500 }
    )
  }
}
