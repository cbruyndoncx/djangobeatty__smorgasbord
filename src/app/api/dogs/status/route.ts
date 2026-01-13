/**
 * API Route: GET /api/dogs/status
 * Get detailed status for all dogs
 * Executes: gt dog status
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt dog status', {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error getting dog status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get dog status', details: message },
      { status: 500 }
    );
  }
}
