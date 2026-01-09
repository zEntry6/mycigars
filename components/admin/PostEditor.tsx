'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDebouncedCallbackWithCancel } from '@/hooks/useDebouncedCallback'
import VersionHistoryModal from './VersionHistoryModal'

/**
 * Post data structure for the editor
 */
export interface PostData {
  title: string
  slug: string
  excerpt: string
  content: string
  status: 'draft' | 'published'
}

/**
 * Initial data with original slug for tracking changes
 */
export interface PostEditorInitialData extends PostData {
  originalSlug?: string  // The slug when the post was first loaded
}

/**
 * Save state for the editor
 */
type SaveState = 
  | { status: 'idle' }
  | { status: 'unsaved' }
  | { status: 'saving' }
  | { status: 'saved'; timestamp: Date }
  | { status: 'error'; message: string }

interface PostEditorProps {
  /**
   * Post ID for editing, undefined for new posts
   */
  postId?: string
  /**
   * Initial data when editing an existing post
   */
  initialData?: PostEditorInitialData
  /**
   * Function to get the auth token
   */
  getToken: () => Promise<string | null>
  /**
   * Called after successful save with the post ID (useful for new posts)
   */
  onSaveSuccess?: (postId: string) => void
  /**
   * Called on auth error (401/403)
   */
  onAuthError?: () => void
}

const AUTOSAVE_DELAY = 1000 // 1 second debounce

/**
 * Auto-generate URL slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Deep compare two PostData objects
 */
function isPostDataEqual(a: PostData, b: PostData): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.excerpt === b.excerpt &&
    a.content === b.content &&
    a.status === b.status
  )
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * PostEditor Component
 * 
 * A full-featured post editor with:
 * - Autosave with debounce
 * - Change tracking (dirty state)
 * - Keyboard shortcuts (Ctrl/Cmd + S)
 * - Leave protection (beforeunload)
 * - Concurrency safety (queued saves)
 * - Status indicators
 */
export default function PostEditor({
  postId,
  initialData,
  getToken,
  onSaveSuccess,
  onAuthError,
}: PostEditorProps) {
  const router = useRouter()
  const isNewPost = !postId

  // Current form data
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [status, setStatus] = useState<'draft' | 'published'>(initialData?.status || 'draft')

  // Save state management
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })
  
  // Version history modal
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  
  // Preview link state
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [previewEnabled, setPreviewEnabled] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewCopied, setPreviewCopied] = useState(false)
  
  // Track if slug was manually edited
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  
  // Track original slug for existing posts (to detect slug changes)
  const originalSlugRef = useRef<string>(initialData?.originalSlug || initialData?.slug || '')

  // Snapshot of last saved data
  const lastSavedDataRef = useRef<PostData>(
    initialData || { title: '', slug: '', excerpt: '', content: '', status: 'draft' }
  )

  // Current post ID (may be set after first save for new posts)
  const currentPostIdRef = useRef<string | undefined>(postId)

  // Save operation tracking for concurrency
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false)
  const saveIdRef = useRef(0)

  /**
   * Get current form data as PostData
   */
  const getCurrentData = useCallback((): PostData => {
    return { title, slug, excerpt, content, status }
  }, [title, slug, excerpt, content, status])

  /**
   * Check if current data differs from last saved
   */
  const isDirty = useCallback((): boolean => {
    const current = getCurrentData()
    return !isPostDataEqual(current, lastSavedDataRef.current)
  }, [getCurrentData])

  /**
   * Perform the actual save operation
   * @param createVersion - If true, creates a version snapshot (for manual saves)
   * @param versionNote - Optional note for the version
   */
  const performSave = useCallback(async (createVersion = false, versionNote?: string): Promise<boolean> => {
    const token = await getToken()
    if (!token) {
      setSaveState({ status: 'error', message: 'Not authenticated' })
      onAuthError?.()
      return false
    }

    const data = getCurrentData()
    const thisSaveId = ++saveIdRef.current

    isSavingRef.current = true
    setSaveState({ status: 'saving' })

    try {
      let response: Response
      let savedPostId = currentPostIdRef.current

      if (currentPostIdRef.current) {
        // Update existing post
        response = await fetch(`/api/admin/posts/${currentPostIdRef.current}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            ...(createVersion && { createVersion: true, versionNote }),
          }),
        })
      } else {
        // Create new post
        response = await fetch('/api/admin/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json()
          savedPostId = result.id
          currentPostIdRef.current = savedPostId
        }
      }

      // Ignore stale responses
      if (thisSaveId !== saveIdRef.current) {
        return false
      }

      if (response.status === 401 || response.status === 403) {
        setSaveState({ status: 'error', message: 'Authentication expired' })
        onAuthError?.()
        return false
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setSaveState({ 
          status: 'error', 
          message: errorData.error || 'Failed to save' 
        })
        return false
      }

      // Success!
      lastSavedDataRef.current = { ...data }
      setSaveState({ status: 'saved', timestamp: new Date() })
      
      if (savedPostId) {
        onSaveSuccess?.(savedPostId)
      }

      return true
    } catch (error) {
      // Ignore stale errors
      if (thisSaveId !== saveIdRef.current) {
        return false
      }
      
      console.error('Save error:', error)
      setSaveState({ 
        status: 'error', 
        message: 'Network error. Check your connection.' 
      })
      return false
    } finally {
      isSavingRef.current = false

      // Process pending save if any
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        // Use setTimeout to avoid immediate re-entry
        setTimeout(() => {
          if (isDirty()) {
            performSave()
          }
        }, 100)
      }
    }
  }, [getToken, getCurrentData, onAuthError, onSaveSuccess, isDirty])

  /**
   * Request a save operation (handles concurrency)
   * @param createVersion - If true, creates a version snapshot (for manual saves)
   * @param versionNote - Optional note for the version
   */
  const requestSave = useCallback((createVersion = false, versionNote?: string) => {
    if (!isDirty()) {
      return
    }

    if (isSavingRef.current) {
      // Queue a save for after current save completes
      pendingSaveRef.current = true
      return
    }

    performSave(createVersion, versionNote)
  }, [isDirty, performSave])

  /**
   * Autosave function (no version creation)
   */
  const autoSave = useCallback(() => {
    requestSave(false)
  }, [requestSave])

  /**
   * Debounced autosave function
   */
  const [debouncedSave, cancelDebouncedSave] = useDebouncedCallbackWithCancel(
    autoSave,
    AUTOSAVE_DELAY
  )

  /**
   * Handle field changes - trigger autosave
   */
  const handleChange = useCallback(() => {
    if (isDirty()) {
      setSaveState({ status: 'unsaved' })
      debouncedSave()
    }
  }, [isDirty, debouncedSave])

  // Trigger handleChange when any field changes
  useEffect(() => {
    handleChange()
  }, [title, slug, excerpt, content, status, handleChange])

  /**
   * Manual save (immediate) - creates a version for existing posts
   */
  const handleManualSave = useCallback(() => {
    cancelDebouncedSave()
    // Only create version for existing posts (new posts don't have history yet)
    const shouldCreateVersion = !!currentPostIdRef.current
    requestSave(shouldCreateVersion, 'Manual save')
  }, [cancelDebouncedSave, requestSave])

  /**
   * Handle version restore - loads version data into form without saving
   */
  const handleVersionRestore = useCallback((version: {
    title: string
    slug: string
    excerpt: string
    content: string
    status: 'draft' | 'published'
  }) => {
    // Cancel any pending autosave
    cancelDebouncedSave()
    
    // Load version data into form
    setTitle(version.title)
    setSlug(version.slug)
    setExcerpt(version.excerpt)
    setContent(version.content)
    setStatus(version.status)
    
    // Mark as unsaved so user can review before saving
    setSaveState({ status: 'unsaved' })
    
    // Don't update lastSavedDataRef - this keeps the dirty state
  }, [cancelDebouncedSave])

  /**
   * Fetch preview status on mount for existing posts
   */
  useEffect(() => {
    if (!currentPostIdRef.current) return

    const fetchPreviewStatus = async () => {
      const token = await getToken()
      if (!token) return

      try {
        const res = await fetch(`/api/admin/posts/${currentPostIdRef.current}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewToken(data.preview?.token || null)
          setPreviewEnabled(data.preview?.enabled || false)
        }
      } catch (error) {
        console.error('Error fetching preview status:', error)
      }
    }

    fetchPreviewStatus()
  }, [getToken])

  /**
   * Generate or regenerate preview link
   */
  const handleGeneratePreviewLink = useCallback(async () => {
    if (!currentPostIdRef.current) return

    setPreviewLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/admin/posts/${currentPostIdRef.current}/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setPreviewToken(data.token)
        setPreviewEnabled(true)
      }
    } catch (error) {
      console.error('Error generating preview link:', error)
    } finally {
      setPreviewLoading(false)
    }
  }, [getToken])

  /**
   * Revoke preview link
   */
  const handleRevokePreviewLink = useCallback(async () => {
    if (!currentPostIdRef.current) return

    setPreviewLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/admin/posts/${currentPostIdRef.current}/preview`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setPreviewToken(null)
        setPreviewEnabled(false)
      }
    } catch (error) {
      console.error('Error revoking preview link:', error)
    } finally {
      setPreviewLoading(false)
    }
  }, [getToken])

  /**
   * Copy preview URL to clipboard
   */
  const handleCopyPreviewLink = useCallback(async () => {
    if (!previewToken) return

    const previewUrl = `${window.location.origin}/preview/${previewToken}`
    try {
      await navigator.clipboard.writeText(previewUrl)
      setPreviewCopied(true)
      setTimeout(() => setPreviewCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }, [previewToken])

  /**
   * Get the full preview URL
   */
  const getPreviewUrl = useCallback(() => {
    if (!previewToken) return ''
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/preview/${previewToken}`
  }, [previewToken])

  /**
   * Keyboard shortcut: Ctrl/Cmd + S
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleManualSave])

  /**
   * Warn on page leave if dirty
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty() || saveState.status === 'saving') {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, saveState.status])

  /**
   * Handle title change with auto-slug generation
   */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited) {
      setSlug(generateSlug(newTitle))
    }
  }

  /**
   * Handle slug change (mark as manually edited)
   */
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true)
    setSlug(e.target.value)
  }
  
  /**
   * Check if slug has changed from original (for existing posts)
   */
  const isSlugChanged = !isNewPost && originalSlugRef.current && slug !== originalSlugRef.current
  
  /**
   * Reset slug to auto-generated from title
   */
  const handleResetSlug = () => {
    setSlugManuallyEdited(false)
    setSlug(generateSlug(title))
  }

  /**
   * Handle delete (for existing posts only)
   */
  const handleDelete = async () => {
    if (!currentPostIdRef.current) return
    if (!confirm('Are you sure you want to delete this writing?')) return

    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/admin/posts/${currentPostIdRef.current}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        // Clear dirty state before navigation
        lastSavedDataRef.current = getCurrentData()
        router.push('/admin/posts')
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  /**
   * Render save status indicator
   */
  const renderStatusIndicator = () => {
    switch (saveState.status) {
      case 'idle':
        return null
      case 'unsaved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-amber-700 bg-amber-50 rounded">
            Unsaved changes
          </span>
        )
      case 'saving':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded">
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving…
          </span>
        )
      case 'saved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded">
            Saved {formatTime(saveState.timestamp)}
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-red-700 bg-red-50 rounded">
            Save failed
            <button
              onClick={handleManualSave}
              className="underline hover:no-underline"
            >
              Retry
            </button>
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Row 1: Back + Title */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link href="/admin/posts" className="text-gray-500 hover:text-gray-700 text-sm flex-shrink-0">
                ← <span className="hidden sm:inline">Back</span>
              </Link>
              <h1 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                {isNewPost ? 'New Writing' : 'Edit Writing'}
              </h1>
            </div>
            {/* Desktop: All actions in one row */}
            <div className="hidden sm:flex items-center gap-3">
              {renderStatusIndicator()}
              {!isNewPost && currentPostIdRef.current && (
                <button
                  onClick={() => setShowVersionHistory(true)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              )}
              {!isNewPost && (
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          {/* Row 2 (Mobile only): Status + Actions */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex-shrink-0">
              {renderStatusIndicator()}
            </div>
            <div className="flex items-center gap-2">
              {!isNewPost && currentPostIdRef.current && (
                <button
                  onClick={() => setShowVersionHistory(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="History"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              {!isNewPost && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-5 sm:space-y-6">
          {/* Error display for auth/critical errors */}
          {saveState.status === 'error' && (
            <div className="bg-red-50 text-red-600 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-sm">
              {saveState.message}
            </div>
          )}

          {/* Title */}
          <div>
            <label 
              htmlFor="title" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={handleTitleChange}
              className="
                w-full px-3 py-2
                border border-gray-300 rounded
                text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
              "
              placeholder="Your writing title"
            />
          </div>

          {/* Slug */}
          <div>
            <label 
              htmlFor="slug" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/posts/</span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={handleSlugChange}
                className="
                  flex-1 px-3 py-2
                  border border-gray-300 rounded
                  text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                "
                placeholder="url-friendly-slug"
              />
              {slugManuallyEdited && (
                <button
                  type="button"
                  onClick={handleResetSlug}
                  className="px-2 py-2 text-xs text-gray-500 hover:text-gray-700"
                  title="Reset slug from title"
                >
                  Reset
                </button>
              )}
            </div>
            {/* Slug change warning for existing posts */}
            {isSlugChanged && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Changing the slug will redirect old links automatically.
              </p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label 
              htmlFor="excerpt" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Excerpt
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="
                w-full px-3 py-2
                border border-gray-300 rounded
                text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                resize-none
              "
              placeholder="A short description of your writing..."
            />
          </div>

          {/* Content */}
          <div>
            <label 
              htmlFor="content" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Content (Markdown)
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="
                w-full px-3 py-2
                border border-gray-300 rounded
                text-sm text-gray-900 font-mono
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                resize-y
              "
              placeholder="Write your content in Markdown..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                  className="text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Published</span>
              </label>
            </div>
          </div>

          {/* Preview Link Section - only for existing posts */}
          {!isNewPost && currentPostIdRef.current && (
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview Link
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Share a secret link to preview this post without publishing. Anyone with the link can view it.
              </p>
              
              {previewEnabled && previewToken ? (
                <div className="space-y-3">
                  {/* Preview URL display */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getPreviewUrl()}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600 font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPreviewLink}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      {previewCopied ? (
                        <>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <a
                      href={getPreviewUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open preview
                    </a>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleGeneratePreviewLink}
                      disabled={previewLoading}
                      className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      {previewLoading ? 'Regenerating...' : 'Regenerate link'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleRevokePreviewLink}
                      disabled={previewLoading}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {previewLoading ? 'Revoking...' : 'Revoke link'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGeneratePreviewLink}
                  disabled={previewLoading}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {previewLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Generate preview link
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveState.status === 'saving' || (!isDirty() && saveState.status !== 'error')}
              className="
                px-4 py-2
                bg-gray-900 text-white text-sm
                rounded
                hover:bg-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {saveState.status === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <Link
              href="/admin/posts"
              className="
                px-4 py-2
                bg-white text-gray-700 text-sm
                border border-gray-300
                rounded
                hover:bg-gray-50
                transition-colors
              "
            >
              Back to Posts
            </Link>
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-xs text-gray-400">
            Tip: Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600">S</kbd> to save immediately
          </p>
        </div>
      </main>

      {/* Version History Modal */}
      {currentPostIdRef.current && (
        <VersionHistoryModal
          postId={currentPostIdRef.current}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleVersionRestore}
          getToken={getToken}
        />
      )}
    </div>
  )
}
