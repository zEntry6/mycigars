import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPostByPreviewToken } from '@/lib/firebase/admin'
import {
  SITE_URL,
  SITE_NAME,
  getCanonicalUrl,
  truncateText,
} from '@/lib/seo'
import { extractHeadings } from '@/lib/toc'
import ArticleLayout from '@/components/ArticleLayout'
import MDXContent from '@/components/MDXContent'
import TableOfContents from '@/components/TableOfContents'

// Enable dynamic rendering - preview tokens must be checked at request time
export const dynamic = 'force-dynamic'

interface PreviewPageProps {
  params: Promise<{
    token: string
  }>
}

/**
 * Generate metadata for preview pages
 * - Always noindex, nofollow
 * - Canonical points to future public URL if published
 */
export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { token } = await params
  const post = await getPostByPreviewToken(token)
  
  if (!post) {
    return {
      title: 'Preview Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description = post.excerpt || truncateText(post.content, 160)
  // Always point canonical to the public URL (even if not yet published)
  const canonicalUrl = getCanonicalUrl(`/posts/${post.slug}`)

  return {
    title: `[Preview] ${post.title}`,
    description: description,
    // CRITICAL: Never index preview pages
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    // No OpenGraph or Twitter cards for previews
    openGraph: null,
    twitter: null,
  }
}

/**
 * Preview Page
 * 
 * Renders a post preview using a secret token.
 * - No authentication required - anyone with the token can view
 * - Works for both draft and published posts
 * - Not indexed by search engines
 * - Shows a draft preview banner
 */
export default async function PreviewPage({ params }: PreviewPageProps) {
  const { token } = await params
  const post = await getPostByPreviewToken(token)

  if (!post) {
    notFound()
  }

  // Use publishedAt for published posts, updatedAt for drafts
  const displayDate = post.status === 'published' && post.publishedAt
    ? post.publishedAt.toISOString().split('T')[0]
    : post.updatedAt?.toISOString().split('T')[0] || ''
  
  // Extract headings for Table of Contents
  const headings = extractHeadings(post.content, [2, 3])

  return (
    <>
      {/* Draft Preview Banner - fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-300">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
              />
            </svg>
            <span className="font-medium">
              {post.status === 'draft' ? 'Draft preview' : 'Preview'} — not public
            </span>
          </div>
          {post.status === 'draft' && (
            <span className="px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded">
              Draft
            </span>
          )}
        </div>
      </div>

      {/* Add top padding to account for fixed banner */}
      <div className="pt-10">
        <ArticleLayout title={post.title} date={displayDate}>
          <TableOfContents headings={headings} />
          <MDXContent content={post.content} />
        </ArticleLayout>
      </div>
    </>
  )
}
