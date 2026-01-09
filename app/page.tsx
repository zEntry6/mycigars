import { Metadata } from 'next'
import { getPublishedPosts } from '@/lib/firebase/admin'
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_URL,
  generateWebsiteJsonLd,
} from '@/lib/seo'
import PaperCard from '@/components/PaperCard'

// Enable dynamic rendering for Firestore data
export const dynamic = 'force-dynamic'

/**
 * Home page metadata
 */
export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: 'website',
  },
}

/**
 * Home Page
 * 
 * Displays a grid/list of all published writings as paper cards.
 */
export default async function HomePage() {
  const posts = await getPublishedPosts()

  // Transform Firestore posts to the format expected by PaperCard
  const formattedPosts = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    date: post.publishedAt?.toISOString().split('T')[0] || '',
  }))

  // JSON-LD structured data
  const jsonLd = generateWebsiteJsonLd()

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      
      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
          <h1 className="text-[clamp(2.1rem,8vw,4.5rem)] leading-[1.05] sm:leading-[0.95] font-serif font-bold text-ink">
            My Cigars, Still Burning
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-ink-muted font-serif max-w-lg mx-auto px-2">
            Published by @faysmokecigars
          </p>
        </header>

        {/* Writings Grid */}
        <section className="w-full max-w-[44rem] mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
          {formattedPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-ink-muted font-serif text-lg">
                The ash tray is still empty. Check back for the first burn.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {formattedPosts.map((post) => (
                <PaperCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-paper-border bg-background-dark">
          <p className="text-center text-sm text-ink-muted font-sans">
            © {new Date().getFullYear()} MyCigarsStillBurn. All rights reserved.
          </p>
        </footer>
      </main>
    </>
  )
}
