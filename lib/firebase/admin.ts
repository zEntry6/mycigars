/**
 * Firebase Admin SDK
 * 
 * Server-side Firebase initialization for:
 * - Firestore write operations
 * - Admin authentication verification
 * 
 * Uses service account credentials from environment variables.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'

let app: App | undefined
let db: Firestore | undefined
let auth: Auth | undefined

/**
 * Safely convert any timestamp-like value to a Date or null.
 * Handles: Firestore Timestamp, JS Date, ISO string, epoch number, null/undefined
 */
function toDateSafe(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  
  // Firestore Timestamp (has toDate method)
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate()
    } catch {
      return null
    }
  }
  
  // JS Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  
  // ISO string
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  
  // Epoch number (milliseconds)
  if (typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  
  return null
}

/**
 * Normalize a Firestore document's timestamp fields safely
 */
function normalizePostTimestamps(data: Record<string, unknown>): {
  publishedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
} {
  return {
    publishedAt: toDateSafe(data.publishedAt),
    createdAt: toDateSafe(data.createdAt),
    updatedAt: toDateSafe(data.updatedAt),
  }
}

function getAdminApp(): App {
  if (app) return app

  const apps = getApps()
  if (apps.length > 0) {
    app = apps[0]
    return app
  }

  // Initialize with service account credentials
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    )
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })

  return app
}

/**
 * Get Firestore instance
 */
export function getAdminFirestore(): Firestore {
  if (db) return db
  db = getFirestore(getAdminApp())
  return db
}

/**
 * Get Auth instance
 */
export function getAdminAuth(): Auth {
  if (auth) return auth
  auth = getAuth(getAdminApp())
  return auth
}

/**
 * Verify Firebase ID token and check if user is admin
 */
export async function verifyAdminToken(idToken: string): Promise<{
  valid: boolean
  email?: string
  uid?: string
}> {
  try {
    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      console.error('ADMIN_EMAIL not set')
      return { valid: false }
    }

    if (decodedToken.email === adminEmail) {
      return {
        valid: true,
        email: decodedToken.email,
        uid: decodedToken.uid,
      }
    }

    return { valid: false }
  } catch (error) {
    console.error('Token verification failed:', error)
    return { valid: false }
  }
}

/**
 * Normalize a slug to lowercase, hyphenated format
 * Removes special characters, converts spaces to hyphens
 */
export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Post type for Firestore
 */
export interface FirestorePost {
  id?: string
  title: string
  slug: string
  oldSlugs?: string[]  // Previous slugs for redirect support
  excerpt: string
  content: string
  status: 'draft' | 'published'
  publishedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Get all posts (admin only - includes drafts)
 * Falls back to unordered query if updatedAt field is missing
 * 
 * @param statusFilter - Optional filter: 'published', 'draft', or undefined for all
 */
export async function getAllPostsAdmin(statusFilter?: 'published' | 'draft'): Promise<FirestorePost[]> {
  const db = getAdminFirestore()
  
  // Try ordered query first, fallback to unordered if it fails
  let snapshot
  try {
    let query = db.collection('posts') as FirebaseFirestore.Query
    
    if (statusFilter) {
      query = query.where('status', '==', statusFilter)
    }
    
    snapshot = await query.orderBy('updatedAt', 'desc').get()
  } catch {
    // Fallback: get posts without ordering
    let query = db.collection('posts') as FirebaseFirestore.Query
    
    if (statusFilter) {
      query = query.where('status', '==', statusFilter)
    }
    
    snapshot = await query.get()
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const timestamps = normalizePostTimestamps(data)
    return {
      id: doc.id,
      title: data.title || '',
      slug: data.slug || '',
      oldSlugs: data.oldSlugs || [],
      excerpt: data.excerpt || '',
      content: data.content || '',
      status: data.status || 'draft',
      ...timestamps,
    } as FirestorePost
  })
}

/**
 * Get published posts only (public)
 */
export async function getPublishedPosts(): Promise<FirestorePost[]> {
  const db = getAdminFirestore()
  
  let snapshot
  try {
    snapshot = await db
      .collection('posts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get()
  } catch {
    // Fallback: get published posts without ordering
    snapshot = await db
      .collection('posts')
      .where('status', '==', 'published')
      .get()
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const timestamps = normalizePostTimestamps(data)
    return {
      id: doc.id,
      title: data.title || '',
      slug: data.slug || '',
      oldSlugs: data.oldSlugs || [],
      excerpt: data.excerpt || '',
      content: data.content || '',
      status: 'published' as const,
      ...timestamps,
    }
  })
}

/**
 * Get single post by slug (public - published only)
 */
export async function getPostBySlug(slug: string): Promise<FirestorePost | null> {
  const db = getAdminFirestore()
  const normalizedSlug = normalizeSlug(slug)
  
  const snapshot = await db
    .collection('posts')
    .where('slug', '==', normalizedSlug)
    .where('status', '==', 'published')
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()
  const timestamps = normalizePostTimestamps(data)
  
  return {
    id: doc.id,
    title: data.title || '',
    slug: data.slug || '',
    oldSlugs: data.oldSlugs || [],
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: 'published' as const,
    ...timestamps,
  }
}

/**
 * Get published post by old slug (for redirects)
 * Searches the oldSlugs array for a match
 */
export async function getPostByOldSlug(oldSlug: string): Promise<FirestorePost | null> {
  const db = getAdminFirestore()
  const normalizedSlug = normalizeSlug(oldSlug)
  
  const snapshot = await db
    .collection('posts')
    .where('oldSlugs', 'array-contains', normalizedSlug)
    .where('status', '==', 'published')
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()
  const timestamps = normalizePostTimestamps(data)
  
  return {
    id: doc.id,
    title: data.title || '',
    slug: data.slug || '',
    oldSlugs: data.oldSlugs || [],
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: 'published' as const,
    ...timestamps,
  }
}

/**
 * Get single post by slug (admin - any status)
 */
export async function getPostBySlugAdmin(slug: string): Promise<FirestorePost | null> {
  const db = getAdminFirestore()
  const normalizedSlug = normalizeSlug(slug)
  
  const snapshot = await db
    .collection('posts')
    .where('slug', '==', normalizedSlug)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()
  const timestamps = normalizePostTimestamps(data)
  
  return {
    id: doc.id,
    title: data.title || '',
    slug: data.slug || '',
    oldSlugs: data.oldSlugs || [],
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'draft',
    ...timestamps,
  }
}

/**
 * Get single post by ID (admin)
 */
export async function getPostById(id: string): Promise<FirestorePost | null> {
  const db = getAdminFirestore()
  const doc = await db.collection('posts').doc(id).get()

  if (!doc.exists) return null

  const data = doc.data() || {}
  const timestamps = normalizePostTimestamps(data)
  
  return {
    id: doc.id,
    title: data.title || '',
    slug: data.slug || '',
    oldSlugs: data.oldSlugs || [],
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'draft',
    ...timestamps,
  }
}

/**
 * Check if a slug is available (not used by another post)
 * Optionally exclude a specific post ID (for updates)
 */
export async function isSlugAvailable(slug: string, excludePostId?: string): Promise<boolean> {
  const db = getAdminFirestore()
  const normalizedSlug = normalizeSlug(slug)
  
  const snapshot = await db
    .collection('posts')
    .where('slug', '==', normalizedSlug)
    .limit(1)
    .get()
  
  if (snapshot.empty) return true
  
  // If excluding a post ID, check if the found post is the same one
  if (excludePostId && snapshot.docs[0].id === excludePostId) {
    return true
  }
  
  return false
}

/**
 * Create a new post
 * Uses Firestore Timestamps for reliable ordering
 * Normalizes slug and initializes empty oldSlugs array
 */
export async function createPost(data: {
  title: string
  slug: string
  excerpt: string
  content: string
  status: 'draft' | 'published'
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = getAdminFirestore()
    const normalizedSlug = normalizeSlug(data.slug)
    
    // Check for duplicate slug
    const slugAvailable = await isSlugAvailable(normalizedSlug)
    if (!slugAvailable) {
      return { success: false, error: 'A post with this slug already exists' }
    }

    const now = FieldValue.serverTimestamp()
    const postData = {
      title: data.title,
      slug: normalizedSlug,
      oldSlugs: [],  // Initialize empty array for future slug changes
      excerpt: data.excerpt,
      content: data.content,
      status: data.status,
      publishedAt: data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await db.collection('posts').add(postData)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Create post error:', error)
    return { success: false, error: 'Failed to create post' }
  }
}

/**
 * Update an existing post
 * Handles slug changes by preserving old slugs for redirects
 * Uses Firestore Timestamps for reliable ordering
 */
export async function updatePost(
  id: string,
  data: {
    title?: string
    slug?: string
    excerpt?: string
    content?: string
    status?: 'draft' | 'published'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const docRef = db.collection('posts').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Post not found' }
    }

    const currentData = doc.data()
    const currentSlug = currentData?.slug || ''
    const currentOldSlugs: string[] = currentData?.oldSlugs || []
    
    // Normalize new slug if provided
    const normalizedNewSlug = data.slug ? normalizeSlug(data.slug) : undefined
    const isSlugChanging = normalizedNewSlug && normalizedNewSlug !== currentSlug
    
    // Check for duplicate slug if slug is being changed
    if (isSlugChanging) {
      const slugAvailable = await isSlugAvailable(normalizedNewSlug, id)
      if (!slugAvailable) {
        return { success: false, error: 'A post with this slug already exists' }
      }
    }

    const now = FieldValue.serverTimestamp()
    
    // Set publishedAt when publishing for the first time
    let publishedAt: ReturnType<typeof FieldValue.serverTimestamp> | null = currentData?.publishedAt || null
    if (data.status === 'published' && currentData?.status !== 'published') {
      publishedAt = now
    } else if (data.status === 'draft') {
      publishedAt = null
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      publishedAt,
      updatedAt: now,
    }
    
    // Add non-slug fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.content !== undefined) updateData.content = data.content
    if (data.status !== undefined) updateData.status = data.status
    
    // Handle slug change with oldSlugs preservation
    if (isSlugChanging) {
      updateData.slug = normalizedNewSlug
      
      // Add current slug to oldSlugs if not already present
      if (currentSlug && !currentOldSlugs.includes(currentSlug)) {
        updateData.oldSlugs = [...currentOldSlugs, currentSlug]
      }
    }

    await docRef.update(updateData)

    return { success: true }
  } catch (error) {
    console.error('Update post error:', error)
    return { success: false, error: 'Failed to update post' }
  }
}

/**
 * Delete a post
 */
export async function deletePost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    await db.collection('posts').doc(id).delete()
    return { success: true }
  } catch (error) {
    console.error('Delete post error:', error)
    return { success: false, error: 'Failed to delete post' }
  }
}

/**
 * Toggle post status between draft and published
 * Uses Firestore Timestamps for reliable ordering
 * Preserves publishedAt on unpublish for historical record
 */
export async function togglePostStatus(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const docRef = db.collection('posts').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Post not found' }
    }

    const data = doc.data()
    const currentStatus = data?.status
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    const now = FieldValue.serverTimestamp()

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    }

    // Only set publishedAt when publishing for the first time (if it's null/undefined)
    if (newStatus === 'published' && !data?.publishedAt) {
      updateData.publishedAt = now
    }
    // Keep publishedAt intact when unpublishing (for historical record)

    await docRef.update(updateData)

    return { success: true }
  } catch (error) {
    console.error('Toggle status error:', error)
    return { success: false, error: 'Failed to toggle status' }
  }
}

/**
 * Publish a draft post
 * Sets publishedAt only if not previously set (preserves first publish date)
 */
export async function publishPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const docRef = db.collection('posts').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Post not found' }
    }

    const data = doc.data()
    const now = FieldValue.serverTimestamp()

    const updateData: Record<string, unknown> = {
      status: 'published',
      updatedAt: now,
    }

    // Only set publishedAt if not previously set
    if (!data?.publishedAt) {
      updateData.publishedAt = now
    }

    await docRef.update(updateData)

    return { success: true }
  } catch (error) {
    console.error('Publish post error:', error)
    return { success: false, error: 'Failed to publish post' }
  }
}

/**
 * Unpublish a published post (revert to draft)
 * Preserves publishedAt for historical record
 */
export async function unpublishPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const docRef = db.collection('posts').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Post not found' }
    }

    await docRef.update({
      status: 'draft',
      updatedAt: FieldValue.serverTimestamp(),
      // publishedAt is intentionally preserved for historical record
    })

    return { success: true }
  } catch (error) {
    console.error('Unpublish post error:', error)
    return { success: false, error: 'Failed to unpublish post' }
  }
}

/**
 * Migrate existing posts to use Firestore Timestamps
 * Safe to re-run (idempotent) - only updates non-Timestamp fields
 */
export async function migratePostTimestamps(): Promise<{ 
  success: boolean
  migrated: number
  errors: string[]
}> {
  const errors: string[] = []
  let migrated = 0
  
  try {
    const db = getAdminFirestore()
    const snapshot = await db.collection('posts').get()
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const updates: Record<string, unknown> = {}
      
      // Check each timestamp field
      for (const field of ['publishedAt', 'createdAt', 'updatedAt']) {
        const value = data[field]
        
        // Skip if already null (for publishedAt on drafts)
        if (value === null && field === 'publishedAt') {
          continue
        }
        
        // Skip if already a Firestore Timestamp
        if (value && typeof value === 'object' && 'toDate' in value) {
          continue
        }
        
        // Convert to Timestamp if it's a convertible value
        const dateValue = toDateSafe(value)
        if (dateValue) {
          updates[field] = Timestamp.fromDate(dateValue)
        } else if (field !== 'publishedAt') {
          // For required fields (createdAt, updatedAt), set to now if missing
          updates[field] = FieldValue.serverTimestamp()
        }
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        try {
          await doc.ref.update(updates)
          migrated++
        } catch (err) {
          errors.push(`Failed to migrate ${doc.id}: ${err}`)
        }
      }
    }
    
    return { success: true, migrated, errors }
  } catch (error) {
    return { 
      success: false, 
      migrated, 
      errors: [...errors, `Migration failed: ${error}`] 
    }
  }
}

// =============================================================================
// POST VERSIONING
// =============================================================================

/**
 * Version document structure
 */
export interface PostVersion {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: 'draft' | 'published'
  createdAt: Date | null
  note?: string
}

const MAX_VERSIONS = 20

/**
 * Create a version snapshot of the current post state.
 * Called before save/publish/unpublish operations.
 * 
 * @param postId - The post ID
 * @param note - Optional description (e.g., "Published", "Manual save")
 */
export async function createVersion(
  postId: string,
  note?: string
): Promise<{ success: boolean; versionId?: string; error?: string }> {
  try {
    const db = getAdminFirestore()
    const postRef = db.collection('posts').doc(postId)
    const postDoc = await postRef.get()

    if (!postDoc.exists) {
      return { success: false, error: 'Post not found' }
    }

    const postData = postDoc.data()!
    
    // Create version snapshot
    const versionData = {
      title: postData.title || '',
      slug: postData.slug || '',
      excerpt: postData.excerpt || '',
      content: postData.content || '',
      status: postData.status || 'draft',
      createdAt: FieldValue.serverTimestamp(),
      ...(note && { note }),
    }

    // Add to versions subcollection
    const versionsRef = postRef.collection('versions')
    const newVersionRef = await versionsRef.add(versionData)

    // Clean up old versions if exceeding limit
    const allVersions = await versionsRef
      .orderBy('createdAt', 'desc')
      .get()

    if (allVersions.size > MAX_VERSIONS) {
      const versionsToDelete = allVersions.docs.slice(MAX_VERSIONS)
      const batch = db.batch()
      versionsToDelete.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
    }

    return { success: true, versionId: newVersionRef.id }
  } catch (error) {
    console.error('Create version error:', error)
    return { success: false, error: 'Failed to create version' }
  }
}

/**
 * Get all versions for a post, sorted by createdAt descending.
 */
export async function getVersions(postId: string): Promise<PostVersion[]> {
  try {
    const db = getAdminFirestore()
    const versionsRef = db
      .collection('posts')
      .doc(postId)
      .collection('versions')
      .orderBy('createdAt', 'desc')

    const snapshot = await versionsRef.get()

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        status: data.status || 'draft',
        createdAt: toDateSafe(data.createdAt),
        note: data.note,
      }
    })
  } catch (error) {
    console.error('Get versions error:', error)
    return []
  }
}

/**
 * Restore a post from a specific version.
 * Does NOT delete other versions.
 * 
 * @param postId - The post ID
 * @param versionId - The version ID to restore
 */
export async function restoreVersion(
  postId: string,
  versionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const postRef = db.collection('posts').doc(postId)
    const versionRef = postRef.collection('versions').doc(versionId)

    const [postDoc, versionDoc] = await Promise.all([
      postRef.get(),
      versionRef.get(),
    ])

    if (!postDoc.exists) {
      return { success: false, error: 'Post not found' }
    }

    if (!versionDoc.exists) {
      return { success: false, error: 'Version not found' }
    }

    const versionData = versionDoc.data()!

    // Create a version of current state before restoring
    await createVersion(postId, 'Before restore')

    // Restore the post content from version (preserve publishedAt)
    const currentData = postDoc.data()!
    await postRef.update({
      title: versionData.title,
      slug: versionData.slug,
      excerpt: versionData.excerpt,
      content: versionData.content,
      status: versionData.status,
      updatedAt: FieldValue.serverTimestamp(),
      // Preserve publishedAt - don't overwrite from version
      // This keeps the original publish date intact
    })

    return { success: true }
  } catch (error) {
    console.error('Restore version error:', error)
    return { success: false, error: 'Failed to restore version' }
  }
}

// ============================================================================
// PREVIEW LINK FUNCTIONS
// ============================================================================

/**
 * Preview data structure for posts
 */
export interface PostPreview {
  token: string | null
  enabled: boolean
  createdAt: Date | null
}

/**
 * Generate a cryptographically secure random token (48 characters)
 */
function generateSecureToken(): string {
  const array = new Uint8Array(36) // 36 bytes = 48 base64 chars
  crypto.getRandomValues(array)
  // Convert to URL-safe base64
  return Buffer.from(array)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate or regenerate a preview token for a post.
 * Sets preview.enabled = true.
 * 
 * @param postId - The post ID
 * @returns The new preview token
 */
export async function generatePreviewToken(
  postId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const db = getAdminFirestore()
    const postRef = db.collection('posts').doc(postId)
    const postDoc = await postRef.get()

    if (!postDoc.exists) {
      return { success: false, error: 'Post not found' }
    }

    const token = generateSecureToken()

    await postRef.update({
      preview: {
        token,
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
      },
    })

    return { success: true, token }
  } catch (error) {
    console.error('Generate preview token error:', error)
    return { success: false, error: 'Failed to generate preview token' }
  }
}

/**
 * Revoke a preview token for a post.
 * Sets preview.enabled = false and clears the token.
 * 
 * @param postId - The post ID
 */
export async function revokePreviewToken(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore()
    const postRef = db.collection('posts').doc(postId)
    const postDoc = await postRef.get()

    if (!postDoc.exists) {
      return { success: false, error: 'Post not found' }
    }

    await postRef.update({
      preview: {
        token: null,
        enabled: false,
        createdAt: FieldValue.serverTimestamp(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Revoke preview token error:', error)
    return { success: false, error: 'Failed to revoke preview token' }
  }
}

/**
 * Get a post by its preview token.
 * Only returns if preview.enabled is true.
 * 
 * @param token - The preview token
 * @returns The post data or null
 */
export async function getPostByPreviewToken(
  token: string
): Promise<(FirestorePost & { previewToken: string }) | null> {
  try {
    const db = getAdminFirestore()
    
    // Query for post with matching token and enabled preview
    const snapshot = await db
      .collection('posts')
      .where('preview.token', '==', token)
      .where('preview.enabled', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()
    const timestamps = normalizePostTimestamps(data)

    return {
      id: doc.id,
      title: data.title || '',
      slug: data.slug || '',
      oldSlugs: data.oldSlugs || [],
      excerpt: data.excerpt || '',
      content: data.content || '',
      status: data.status || 'draft',
      ...timestamps,
      previewToken: token,
    }
  } catch (error) {
    console.error('Get post by preview token error:', error)
    return null
  }
}

/**
 * Get the preview data for a post (for admin display).
 * 
 * @param postId - The post ID
 * @returns Preview data or null
 */
export async function getPostPreview(
  postId: string
): Promise<PostPreview | null> {
  try {
    const db = getAdminFirestore()
    const postRef = db.collection('posts').doc(postId)
    const postDoc = await postRef.get()

    if (!postDoc.exists) {
      return null
    }

    const data = postDoc.data()
    const preview = data?.preview

    if (!preview) {
      return {
        token: null,
        enabled: false,
        createdAt: null,
      }
    }

    return {
      token: preview.token || null,
      enabled: preview.enabled || false,
      createdAt: toDateSafe(preview.createdAt),
    }
  } catch (error) {
    console.error('Get post preview error:', error)
    return null
  }
}
