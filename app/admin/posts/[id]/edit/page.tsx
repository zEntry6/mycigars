'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'
import PostEditor, { PostEditorInitialData } from '@/components/admin/PostEditor'

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

/**
 * Edit Post Page
 * 
 * Load existing post and edit using PostEditor with autosave
 */
export default function EditPostPage({ params }: EditPostPageProps) {
  const router = useRouter()
  const { user, loading, getToken } = useAuth()
  const [postId, setPostId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<PostEditorInitialData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingPost, setLoadingPost] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadPost = async () => {
      const { id } = await params
      setPostId(id)
      
      if (!user) return

      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`/api/admin/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setInitialData({
            title: data.post.title,
            slug: data.post.slug,
            originalSlug: data.post.slug,  // Track original slug for change detection
            excerpt: data.post.excerpt || '',
            content: data.post.content,
            status: data.post.status,
          })
        } else {
          setLoadError('Post not found')
        }
      } catch {
        setLoadError('Failed to load post')
      } finally {
        setLoadingPost(false)
      }
    }

    if (user) {
      loadPost()
    }
  }, [params, user, getToken])

  const handleAuthError = () => {
    router.push('/admin/login')
  }

  if (loading || loadingPost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <a href="/admin/posts" className="text-gray-500 hover:text-gray-700">
              ← Back to posts
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded text-sm">
            {loadError}
          </div>
        </main>
      </div>
    )
  }

  if (!postId || !initialData) {
    return null
  }

  return (
    <PostEditor
      postId={postId}
      initialData={initialData}
      getToken={getToken}
      onAuthError={handleAuthError}
    />
  )
}
