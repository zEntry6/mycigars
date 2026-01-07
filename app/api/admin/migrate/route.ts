import { NextRequest, NextResponse } from 'next/server'
import { migratePostTimestamps, verifyAdminToken } from '@/lib/firebase/admin'

/**
 * POST /api/admin/migrate
 * 
 * One-time migration to convert timestamp fields to Firestore Timestamps.
 * Safe to re-run (idempotent).
 * Admin only.
 */
export async function POST(request: NextRequest) {
  // Verify admin auth
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const result = await verifyAdminToken(token)

  if (!result.valid) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  try {
    const migrationResult = await migratePostTimestamps()
    
    return NextResponse.json({
      success: migrationResult.success,
      message: `Migration complete. ${migrationResult.migrated} posts updated.`,
      migrated: migrationResult.migrated,
      errors: migrationResult.errors,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}
