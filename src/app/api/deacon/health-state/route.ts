/**
 * API Route: GET /api/deacon/health-state
 * Returns health check state for all monitored agents
 * Executes: gt deacon health-state
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt deacon health-state', {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error getting deacon health state:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get deacon health state', details: message },
      { status: 500 }
    );
  }
}
