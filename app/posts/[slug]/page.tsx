import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getPostBySlug, getPostByOldSlug } from '@/lib/firebase/admin'
import {
  SITE_URL,
  SITE_NAME,
  AUTHOR_NAME,
  getCanonicalUrl,
  truncateText,
  generateArticleJsonLd,
} from '@/lib/seo'
import { extractHeadings } from '@/lib/toc'
import ArticleLayout from '@/components/ArticleLayout'
import MDXContent from '@/components/MDXContent'
import TableOfContents from '@/components/TableOfContents'

// Enable dynamic rendering for Firestore data
export const dynamic = 'force-dynamic'

interface PostPageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * Resolve post by slug, with redirect support for old slugs
 * Returns the post if found, or redirects if slug is an old slug
 */
async function resolvePost(slug: string) {
  // First, try to find by current slug
  const post = await getPostBySlug(slug)
  if (post) {
    return { post, shouldRedirect: false, redirectSlug: null }
  }
  
  // Not found by current slug, check if it's an old slug
  const postByOldSlug = await getPostByOldSlug(slug)
  if (postByOldSlug) {
    return { post: postByOldSlug, shouldRedirect: true, redirectSlug: postByOldSlug.slug }
  }
  
  // Not found at all
  return { post: null, shouldRedirect: false, redirectSlug: null }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const { post, shouldRedirect, redirectSlug } = await resolvePost(slug)
  
  // If this is an old slug that should redirect, don't index this URL
  if (shouldRedirect && redirectSlug) {
    return {
      title: 'Redirecting...',
      robots: {
        index: false,
        follow: true,
      },
    }
  }
  
  if (!post) {
    return {
      title: 'Post Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  // Use excerpt or truncated content as description
  const description = post.excerpt || truncateText(post.content, 160)
  // Always use the current slug for canonical URL
  const canonicalUrl = getCanonicalUrl(`/posts/${post.slug}`)
  const publishedTime = post.publishedAt?.toISOString()
  const modifiedTime = post.updatedAt?.toISOString()

  // Generate OG image URL
  const ogImageUrl = `${SITE_URL}/og/posts/${post.slug}`

  return {
    title: post.title,
    description: description,
    authors: [{ name: AUTHOR_NAME }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title} — ${SITE_NAME}`,
      description: description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'article',
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      authors: [AUTHOR_NAME],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} — ${SITE_NAME}`,
      description: description,
      images: [ogImageUrl],
    },
  }
}

/**
 * Post Page
 * 
 * Displays a single published article with full content.
 * Handles redirects from old slugs to current slug (301 permanent redirect).
 */
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const { post, shouldRedirect, redirectSlug } = await resolvePost(slug)

  // Redirect old slug to current slug (301 permanent)
  if (shouldRedirect && redirectSlug) {
    redirect(`/posts/${redirectSlug}`)
  }

  if (!post) {
    notFound()
  }

  const formattedDate = post.publishedAt?.toISOString().split('T')[0] || ''
  
  // Extract headings for Table of Contents
  const headings = extractHeadings(post.content, [2, 3])
  
  // Generate JSON-LD structured data (always use current slug)
  const description = post.excerpt || truncateText(post.content, 160)
  const jsonLd = generateArticleJsonLd({
    title: post.title,
    description: description,
    slug: post.slug,  // Always current slug
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  })

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      
      <ArticleLayout title={post.title} date={formattedDate}>
        <TableOfContents headings={headings} />
        <MDXContent content={post.content} />
      </ArticleLayout>
    </>
  )
}
