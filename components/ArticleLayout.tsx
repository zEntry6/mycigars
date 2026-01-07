import Link from 'next/link'

interface ArticleLayoutProps {
  title: string
  date: string
  children: React.ReactNode
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * ArticleLayout Component
 * 
 * A single continuous sheet of paper for long-form reading.
 * - Physical paper with subtle fold crease near top
 * - Navigation integrated into paper margin
 * - Soft edge shading (no hard borders)
 * - Book-like centered layout
 * - Print-inspired typography
 */
export default function ArticleLayout({
  title,
  date,
  children,
}: ArticleLayoutProps) {
  return (
    <div className="min-h-screen bg-[#e8e4dc] pt-8 md:pt-12">
      {/* The Paper - one continuous sheet */}
      <article className="article-paper">
        {/* Subtle edge shading - left */}
        <div className="article-edge-left" aria-hidden="true" />
        {/* Subtle edge shading - right */}
        <div className="article-edge-right" aria-hidden="true" />
        {/* Very light paper texture */}
        <div className="article-texture" aria-hidden="true" />
        {/* Horizontal fold crease near top */}
        <div className="article-crease" aria-hidden="true" />

        {/* Content area */}
        <div className="relative z-10">
          {/* Top margin with navigation - part of the paper */}
          <nav className="mb-12 md:mb-16">
            <Link
              href="/"
              className="
                inline-flex
                items-center
                gap-1.5
                text-[11px]
                font-sans
                tracking-widest
                uppercase
                text-stone-400
                hover:text-stone-500
              "
            >
              <span className="text-stone-300">←</span>
              <span>Writings</span>
            </Link>
          </nav>

          {/* Article Header - print style with ink-bleed title */}
          <header className="article-header">
            <time
              dateTime={date}
              className="
                block
                text-[10px]
                font-sans
                tracking-[0.2em]
                uppercase
                text-stone-400
                mb-4
              "
            >
              {formatDate(date)}
            </time>
            <h1 className="article-title ink-bleed">
              {title}
            </h1>
          </header>

          {/* Article Body */}
          <div className="article-prose">
            {children}
          </div>

          {/* End of article - generous breathing space */}
          <footer className="article-ending" aria-label="End of article">
            <span className="article-finis" aria-hidden="true">∎</span>
          </footer>
        </div>
      </article>

      {/* Footer - outside the paper */}
      <footer className="max-w-[720px] mx-auto px-8 py-10 md:py-12 text-center">
        <Link
          href="/"
          className="
            text-[11px]
            font-sans
            tracking-widest
            uppercase
            text-stone-400
            hover:text-stone-500
          "
        >
          ← Return to writings
        </Link>
      </footer>
    </div>
  )
}
