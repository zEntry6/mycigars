'use client'

import { AuthProvider } from '@/lib/firebase/auth-context'

/**
 * Admin Layout
 * 
 * Wraps all /admin routes with Firebase Auth provider.
 * Note: Metadata for noindex is handled in a separate metadata.ts file
 * since this is a client component.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
