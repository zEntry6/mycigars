/**
 * Firebase Client SDK
 * 
 * Client-side Firebase initialization for:
 * - Google Authentication
 * - Real-time listeners (if needed)
 * 
 * Only handles auth - all Firestore writes go through server API.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth'

// Firebase client configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | undefined
let auth: Auth | undefined

/**
 * Get Firebase app instance
 */
function getFirebaseApp(): FirebaseApp {
  if (app) return app

  const apps = getApps()
  if (apps.length > 0) {
    app = apps[0]
    return app
  }

  app = initializeApp(firebaseConfig)
  return app
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (auth) return auth
  auth = getAuth(getFirebaseApp())
  return auth
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  try {
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    
    // Check if user email matches admin email
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (adminEmail && result.user.email !== adminEmail) {
      // Sign out non-admin users
      await signOut(auth)
      return {
        success: false,
        error: 'Access denied. Only the admin can sign in.',
      }
    }

    return { success: true, user: result.user }
  } catch (error) {
    console.error('Google sign-in error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign-in failed',
    }
  }
}

/**
 * Sign out
 */
export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth()
  await signOut(auth)
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth()
  return auth.currentUser
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth()
  return onAuthStateChanged(auth, callback)
}

/**
 * Get ID token for current user
 */
export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Check if current user is authenticated
 */
export function isAuthenticated(): boolean {
  const auth = getFirebaseAuth()
  return !!auth.currentUser
}
