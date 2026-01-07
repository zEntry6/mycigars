import { NextRequest, NextResponse } from 'next/server'
import { getVersions } from '@/lib/firebase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const versions = await getVersions(id)
    
    // Serialize dates for JSON response
    const serializedVersions = versions.map(version => ({
      ...version,
      createdAt: version.createdAt?.toISOString?.() || version.createdAt,
    }))

    return NextResponse.json({ versions: serializedVersions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}
