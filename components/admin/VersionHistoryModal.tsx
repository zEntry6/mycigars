'use client'

import { useState, useEffect, useCallback } from 'react'

interface Version {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: 'draft' | 'published'
  createdAt: string
  note?: string
}

interface VersionHistoryModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  onRestore: (version: Version) => void
  getToken: () => Promise<string | null>
}

/**
 * Format a date string for display
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return formatDateTime(dateString)
}

/**
 * VersionHistoryModal - Shows list of versions with preview and restore options
 */
export default function VersionHistoryModal({
  postId,
  isOpen,
  onClose,
  onRestore,
  getToken,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<Version | null>(null)

  // Fetch versions when modal opens
  const fetchVersions = useCallback(async () => {
    if (!postId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) {
        setError('Not authenticated')
        return
      }

      const res = await fetch(`/api/admin/posts/${postId}/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch versions')
      }

      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Error fetching versions:', err)
      setError('Failed to load version history')
    } finally {
      setLoading(false)
    }
  }, [postId, getToken])

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
      setPreviewVersion(null)
      setConfirmRestore(null)
    }
  }, [isOpen, fetchVersions])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmRestore) {
          setConfirmRestore(null)
        } else if (previewVersion) {
          setPreviewVersion(null)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, previewVersion, confirmRestore])

  // Handle restore confirmation
  const handleRestore = (version: Version) => {
    setConfirmRestore(null)
    setPreviewVersion(null)
    onRestore(version)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {previewVersion ? 'Preview Version' : 'Version History'}
          </h2>
          <button
            onClick={previewVersion ? () => setPreviewVersion(null) : onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            {previewVersion ? (
              <span className="text-sm">← Back to list</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchVersions}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Try again
              </button>
            </div>
          ) : previewVersion ? (
            // Preview view
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatDateTime(previewVersion.createdAt)}</span>
                {previewVersion.note && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {previewVersion.note}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <p className="text-sm text-gray-900">{previewVersion.title || '(No title)'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
                  <p className="text-sm text-gray-600 font-mono">/posts/{previewVersion.slug || '(No slug)'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Excerpt</label>
                  <p className="text-sm text-gray-700">{previewVersion.excerpt || '(No excerpt)'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
                  <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 max-h-48 overflow-auto whitespace-pre-wrap font-mono">
                    {previewVersion.content || '(No content)'}
                  </pre>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                    previewVersion.status === 'published' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {previewVersion.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setConfirmRestore(previewVersion)}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
                >
                  Restore this version
                </button>
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No versions yet</p>
              <p className="text-sm mt-1">Versions are created when you manually save, publish, or unpublish.</p>
            </div>
          ) : (
            // Version list
            <div className="space-y-2">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {version.title || '(No title)'}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          Latest
                        </span>
                      )}
                      {version.note && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {version.note}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getRelativeTime(version.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setPreviewVersion(version)}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setConfirmRestore(version)}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!loading && !error && versions.length > 0 && !previewVersion && (
          <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-500">
            Up to 20 versions are kept. Older versions are automatically removed.
          </div>
        )}
      </div>

      {/* Confirm restore dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Restore this version?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will replace your current content with the version from {formatDateTime(confirmRestore.createdAt)}.
              The content will be loaded into the editor but <strong>not saved automatically</strong>.
              You can review and save when ready.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
