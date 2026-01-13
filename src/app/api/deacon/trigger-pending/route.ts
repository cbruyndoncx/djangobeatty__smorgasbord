/**
 * API Route: POST /api/deacon/trigger-pending
 * Trigger pending polecat spawns (bootstrap mode)
 * Executes: gt deacon trigger-pending
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { stdout, stderr } = await execGt('gt deacon trigger-pending', {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      action: 'trigger-pending',
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error triggering pending spawns:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to trigger pending spawns', details: message },
      { status: 500 }
    );
  }
}
