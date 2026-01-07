import { NextResponse } from 'next/server'
import { getPublishedPosts } from '@/lib/firebase/admin'

/**
 * GET /api/posts
 * 
 * List all published posts, sorted by publishedAt descending.
 * Public endpoint - no authentication required.
 */
export async function GET() {
  try {
    const posts = await getPublishedPosts()
    
    // Convert dates to ISO strings for JSON serialization
    const serializedPosts = posts.map((post) => ({
      ...post,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt?.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    }))

    return NextResponse.json({ posts: serializedPosts })
  } catch (error) {
    console.error('GET /api/posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
