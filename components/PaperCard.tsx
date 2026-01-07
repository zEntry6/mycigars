import Link from 'next/link'

interface PostMeta {
  title: string
  slug: string
  excerpt: string
  date: string
}

interface PaperCardProps {
  post: PostMeta
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
 * PaperCard Component
 * 
 * A physically realistic paper card:
 * - Radial vignette background (darker edges, calm center)
 * - Edge-concentrated texture (not uniform)
 * - Readable folded corner with crease line
 * - Layered asymmetric shadows
 * - Minimal hover lift with subtle rotation
 */
export default function PaperCard({ post }: PaperCardProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <article className="paper-card group relative overflow-hidden">
        {/* Edge vignette - darkens edges organically */}
        <div className="paper-edge-vignette" aria-hidden="true" />
        
        {/* Paper texture - concentrated at edges */}
        <div className="paper-texture" aria-hidden="true" />
        
        {/* Folded corner with shadow */}
        <div className="paper-fold-shadow" aria-hidden="true" />
        <div className="paper-fold" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 p-8 md:p-10 lg:p-12">
          {/* Published Date */}
          <time
            dateTime={post.date}
            className="
              block
              text-xs
              text-stone-400
              font-sans
              tracking-widest
              uppercase
              mb-4
            "
          >
            {formatDate(post.date)}
          </time>

          {/* Title */}
          <h2
            className="
              text-2xl
              md:text-3xl
              font-serif
              font-bold
              text-stone-800
              leading-snug
              tracking-tight
              group-hover:text-stone-900
              transition-colors
              duration-300
            "
          >
            {post.title}
          </h2>

          {/* Excerpt */}
          <p
            className="
              mt-4
              text-stone-600
              font-serif
              text-base
              md:text-lg
              leading-relaxed
              line-clamp-3
            "
          >
            {post.excerpt}
          </p>

          {/* Read More */}
          <span
            className="
              inline-block
              mt-6
              text-xs
              font-sans
              tracking-wide
              uppercase
              text-stone-400
              group-hover:text-stone-600
              transition-colors
              duration-300
            "
          >
            Continue reading →
          </span>
        </div>
      </article>
    </Link>
  )
}