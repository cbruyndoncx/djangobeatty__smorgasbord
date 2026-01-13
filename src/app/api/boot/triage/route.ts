/**
 * API Route: POST /api/boot/triage
 * Run triage directly (degraded mode)
 * Executes: gt boot triage
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { stdout, stderr } = await execGt('gt boot triage', {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      action: 'triage',
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error running boot triage:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to run boot triage', details: message },
      { status: 500 }
    );
  }
}
