/**
 * API Route: GET /api/status
 * Returns Gas Town status from gt status --json
 */

import { NextResponse } from 'next/server';
import { getGtStatus } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getGtStatus();

    if (!status) {
      return NextResponse.json(
        { error: 'Failed to fetch Gas Town status' },
        { status: 500 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching Gas Town status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gas Town status' },
      { status: 500 }
    );
  }
}
