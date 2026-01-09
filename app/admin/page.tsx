'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'

interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  updatedAt: string
}

/**
 * Admin Dashboard
 * 
 * Simple overview page.
 * - Quick stats
 * - Navigation to key actions
 * - Clean, utilitarian design
 */
export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading, getToken, signOut } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchPosts() {
      if (!user) return
      
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch('/api/admin/posts', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts)
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setLoadingPosts(false)
      }
    }

    if (user) {
      fetchPosts()
    }
  }, [user, getToken])

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
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

  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount = posts.filter(p => p.status === 'draft').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base sm:text-lg font-medium text-gray-900">
            My Cigars, Still Burning
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2">
            Dashboard
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            Manage your writings.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200 rounded px-4 py-3">
            <div className="text-xl sm:text-2xl font-medium text-gray-900">
              {loadingPosts ? '—' : posts.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              Total writings
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded px-4 py-3">
            <div className="text-xl sm:text-2xl font-medium text-gray-900">
              {loadingPosts ? '—' : publishedCount}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              Published
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded px-4 py-3">
            <div className="text-xl sm:text-2xl font-medium text-gray-900">
              {loadingPosts ? '—' : draftCount}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              Drafts
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/admin/posts/new"
            className="
              inline-flex items-center gap-2
              px-4 py-2
              bg-gray-900 text-white text-sm
              rounded
              hover:bg-gray-800
              transition-colors
            "
          >
            <span>+</span>
            <span>New Writing</span>
          </Link>
          <Link
            href="/admin/posts"
            className="
              inline-flex items-center
              px-4 py-2
              bg-white text-gray-700 text-sm
              border border-gray-300
              rounded
              hover:bg-gray-50
              transition-colors
            "
          >
            All Writings
          </Link>
        </div>

        {/* Recent Posts */}
        {!loadingPosts && posts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Recent Writings
            </h3>
            <div className="bg-white border border-gray-200 rounded divide-y divide-gray-100">
              {posts.slice(0, 5).map((post) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}/edit`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {post.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`
                    text-xs px-2 py-0.5 rounded
                    ${post.status === 'published' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {post.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
