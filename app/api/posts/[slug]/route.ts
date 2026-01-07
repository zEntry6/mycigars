import { NextRequest, NextResponse } from 'next/server'
import { getPostBySlug } from '@/lib/firebase/admin'

/**
 * GET /api/posts/[slug]
 * 
 * Get a single published post by slug.
 * Public endpoint - no authentication required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getPostBySlug(slug)

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
    console.error('GET /api/posts/[slug] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}
