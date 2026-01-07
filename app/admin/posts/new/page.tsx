'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'
import PostEditor from '@/components/admin/PostEditor'

/**
 * New Post Page
 * 
 * Uses PostEditor component with autosave support
 */
export default function NewPostPage() {
  const router = useRouter()
  const { user, loading, getToken } = useAuth()
  const [savedPostId, setSavedPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login')
    }
  }, [user, loading, router])

  // Update URL after first save (new post gets an ID)
  useEffect(() => {
    if (savedPostId) {
      // Replace current URL to edit page so refresh works correctly
      router.replace(`/admin/posts/${savedPostId}/edit`)
    }
  }, [savedPostId, router])

  const handleAuthError = () => {
    router.push('/admin/login')
  }

  const handleSaveSuccess = (postId: string) => {
    // Only set once (for new posts)
    if (!savedPostId) {
      setSavedPostId(postId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <PostEditor
      getToken={getToken}
      onSaveSuccess={handleSaveSuccess}
      onAuthError={handleAuthError}
    />
  )
}
