import { NextRequest, NextResponse } from 'next/server'
import { getPostById, updatePost, deletePost, togglePostStatus, publishPost, unpublishPost, createVersion, verifyAdminToken } from '@/lib/firebase/admin'

/**
 * Verify admin authorization from request headers
 */
async function verifyAuth(request: NextRequest): Promise<{
  authorized: boolean
  error?: string
}> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' }
  }

  const token = authHeader.substring(7)
  const result = await verifyAdminToken(token)

  if (!result.valid) {
    return { authorized: false, error: 'Invalid or expired token' }
  }

  return { authorized: true }
}

/**
 * GET /api/admin/posts/[id]
 * 
 * Get a single post by ID (any status).
 * Admin only - requires valid Firebase ID token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const post = await getPostById(id)

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Convert dates to ISO strings for JSON serialization
    const serializedPost = {
      ...post,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt?.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    }

    return NextResponse.json({ post: serializedPost })
  } catch (error) {
    console.error('GET /api/admin/posts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/posts/[id]
 * 
 * Update an existing post.
 * Admin only - requires valid Firebase ID token.
 * 
 * Body params:
 * - title, slug, excerpt, content, status: Post data
 * - createVersion: boolean - If true, creates a version snapshot before saving (for manual saves)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { title, slug, excerpt, content, status, createVersion: shouldCreateVersion } = body

    // Validate status if provided
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "published"' },
        { status: 400 }
      )
    }

    // Create version snapshot before saving (only on manual save)
    if (shouldCreateVersion) {
      await createVersion(id, 'Manual save')
    }

    const result = await updatePost(id, {
      ...(title && { title }),
      ...(slug && { slug }),
      ...(excerpt !== undefined && { excerpt }),
      ...(content && { content }),
      ...(status && { status }),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/posts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/posts/[id]
 * 
 * Delete a post.
 * Admin only - requires valid Firebase ID token.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const result = await deletePost(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/posts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/posts/[id]
 * 
 * Toggle post status OR perform specific action (publish/unpublish).
 * Admin only - requires valid Firebase ID token.
 * Creates a version snapshot before status change.
 * 
 * Body (optional):
 * - action: 'publish' | 'unpublish' | 'toggle' (default: 'toggle')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    
    // Parse action from body (optional)
    let action = 'toggle'
    try {
      const body = await request.json()
      if (body.action && ['publish', 'unpublish', 'toggle'].includes(body.action)) {
        action = body.action
      }
    } catch {
      // No body or invalid JSON - use default 'toggle' action
    }

    // Create version snapshot before status change
    const versionNote = action === 'publish' ? 'Before publish' 
      : action === 'unpublish' ? 'Before unpublish' 
      : 'Before status toggle'
    await createVersion(id, versionNote)
    
    let result
    switch (action) {
      case 'publish':
        result = await publishPost(id)
        break
      case 'unpublish':
        result = await unpublishPost(id)
        break
      default:
        result = await togglePostStatus(id)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/admin/posts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update post status' },
      { status: 500 }
    )
  }
}
