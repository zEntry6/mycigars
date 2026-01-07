'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'

type StatusFilter = 'all' | 'published' | 'draft'

interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string | null
  createdAt: string | null
}

interface PostCounts {
  all: number
  published: number
  draft: number
}

/**
 * All Posts Page
 * 
 * Admin dashboard for managing posts with:
 * - Tabs for All/Published/Drafts filtering
 * - Post counts per tab
 * - Actions: Edit, Publish/Unpublish, Delete
 */
export default function AdminPostsPage() {
  const router = useRouter()
  const { user, loading, getToken } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [counts, setCounts] = useState<PostCounts>({ all: 0, published: 0, draft: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login')
    }
  }, [user, loading, router])

  const fetchPosts = useCallback(async (status: StatusFilter = 'all') => {
    if (!user) return
    
    setLoadingPosts(true)
    setError(null)
    
    try {
      const token = await getToken()
      if (!token) {
        setError('Failed to get authentication token')
        return
      }

      const url = status === 'all' 
        ? '/api/admin/posts' 
        : `/api/admin/posts?status=${status}`
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.status === 401 || res.status === 403) {
        setError('Authentication failed. Please log in again.')
        router.push('/admin/login')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to fetch posts')
        return
      }

      const data = await res.json()
      setPosts(data.posts)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoadingPosts(false)
    }
  }, [user, getToken, router])

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    if (!user) return
    
    try {
      const token = await getToken()
      if (!token) return

      // Fetch all posts to calculate counts
      const res = await fetch('/api/admin/posts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        const allPosts = data.posts as Post[]
        
        setCounts({
          all: allPosts.length,
          published: allPosts.filter(p => p.status === 'published').length,
          draft: allPosts.filter(p => p.status === 'draft').length,
        })
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err)
    }
  }, [user, getToken])

  useEffect(() => {
    if (user) {
      fetchPosts(activeTab)
      fetchCounts()
    }
  }, [user, activeTab, fetchPosts, fetchCounts])

  const handleTabChange = (tab: StatusFilter) => {
    setActiveTab(tab)
  }

  const handlePublish = async (id: string) => {
    setActionLoading(id)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'publish' }),
      })

      if (res.ok) {
        await Promise.all([fetchPosts(activeTab), fetchCounts()])
      }
    } catch (err) {
      console.error('Failed to publish:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnpublish = async (id: string) => {
    setActionLoading(id)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'unpublish' }),
      })

      if (res.ok) {
        await Promise.all([fetchPosts(activeTab), fetchCounts()])
      }
    } catch (err) {
      console.error('Failed to unpublish:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
      return
    }

    setActionLoading(id)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        await Promise.all([fetchPosts(activeTab), fetchCounts()])
      }
    } catch (err) {
      console.error('Failed to delete post:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return '—'
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

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Drafts' },
  ]

  const emptyMessages: Record<StatusFilter, { title: string; description: string }> = {
    all: {
      title: 'No writings yet',
      description: 'Create your first writing to get started.',
    },
    published: {
      title: 'No published posts',
      description: 'Publish a draft to make it visible to readers.',
    },
    draft: {
      title: 'No drafts',
      description: 'All your writings are published!',
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              ← Back
            </Link>
            <h1 className="text-lg font-medium text-gray-900">
              All Writings
            </h1>
          </div>
          <Link
            href="/admin/posts/new"
            className="
              inline-flex items-center gap-2
              px-3 py-1.5
              bg-gray-900 text-white text-sm
              rounded
              hover:bg-gray-800
              transition-colors
            "
          >
            <span>+</span>
            <span>New</span>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-6" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                <span className={`
                  ml-2 px-2 py-0.5 text-xs rounded-full
                  ${activeTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {loadingPosts ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">{emptyMessages[activeTab].title}</p>
            <p className="text-gray-400 text-sm mb-4">{emptyMessages[activeTab].description}</p>
            {activeTab === 'all' && (
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
                Create your first writing
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Updated
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Published
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {post.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        /{post.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center
                        text-xs px-2 py-0.5 rounded font-medium
                        ${post.status === 'published' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }
                      `}>
                        {post.status === 'published' ? '● Published' : '○ Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(post.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {post.status === 'published' 
                        ? formatDate(post.publishedAt)
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                        {post.status === 'draft' ? (
                          <button
                            onClick={() => handlePublish(post.id)}
                            disabled={actionLoading === post.id}
                            className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnpublish(post.id)}
                            disabled={actionLoading === post.id}
                            className="text-sm text-amber-600 hover:text-amber-800 disabled:opacity-50"
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={actionLoading === post.id}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
