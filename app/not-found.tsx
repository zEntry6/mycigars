import Link from 'next/link'

/**
 * 404 Not Found Page
 * Displayed when a post or page is not found
 */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-6xl font-serif font-bold text-ink mb-4">404</h1>
        <p className="text-xl text-ink-muted font-serif mb-8">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="
            inline-block
            px-6
            py-3
            bg-paper-cream
            border border-paper-border
            rounded-sm
            shadow-paper
            text-ink
            font-sans
            text-sm
            hover:shadow-paper-hover
            hover:-translate-y-0.5
            transition-all
            duration-200
          "
        >
          ← Return to writings
        </Link>
      </div>
    </main>
  )
}
