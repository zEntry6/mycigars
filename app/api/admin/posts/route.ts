import { NextRequest, NextResponse } from 'next/server'
import { getAllPostsAdmin, createPost, verifyAdminToken } from '@/lib/firebase/admin'

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
 * GET /api/admin/posts
 * 
 * List all posts (including drafts), sorted by updatedAt descending.
 * Admin only - requires valid Firebase ID token.
 * 
 * Query params:
 * - status: 'published' | 'draft' | 'all' (default: 'all')
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    // Parse status filter from query params
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    
    let statusFilter: 'published' | 'draft' | undefined
    if (statusParam === 'published' || statusParam === 'draft') {
      statusFilter = statusParam
    }
    
    const posts = await getAllPostsAdmin(statusFilter)
    
    // Convert dates to ISO strings for JSON serialization
    const serializedPosts = posts.map((post) => ({
      ...post,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt?.toISOString() || null,
      updatedAt: post.updatedAt?.toISOString() || null,
    }))

    return NextResponse.json({ posts: serializedPosts })
  } catch (error) {
    console.error('GET /api/admin/posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/posts
 * 
 * Create a new post.
 * Admin only - requires valid Firebase ID token.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { title, slug, excerpt, content, status } = body

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, content' },
        { status: 400 }
      )
    }

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "published"' },
        { status: 400 }
      )
    }

    const result = await createPost({
      title,
      slug,
      excerpt: excerpt || '',
      content,
      status: status || 'draft',
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, id: result.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/admin/posts error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
