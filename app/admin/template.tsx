import { Metadata } from 'next'

/**
 * Admin routes metadata
 * 
 * All admin routes should be excluded from search engine indexing.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

/**
 * Admin template
 * 
 * This template wraps all admin pages and provides noindex metadata.
 * The actual layout with AuthProvider is in layout.tsx.
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
