/**
 * API Route: POST /api/boot/spawn
 * Spawn Boot for triage
 * Executes: gt boot spawn
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { stdout, stderr } = await execGt('gt boot spawn', {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      action: 'spawn',
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error spawning boot:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to spawn boot', details: message },
      { status: 500 }
    );
  }
}
