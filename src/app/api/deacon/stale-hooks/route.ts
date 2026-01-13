/**
 * API Route: /api/deacon/stale-hooks
 * GET - List stale hooked beads
 * POST - Unhook stale hooked beads
 * Executes: gt deacon stale-hooks
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/deacon/stale-hooks
 * List stale hooked beads without unhooking them
 */
export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt deacon stale-hooks --dry-run 2>&1 || true', {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error listing stale hooks:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list stale hooks', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deacon/stale-hooks
 * Unhook stale hooked beads
 */
export async function POST() {
  try {
    const { stdout, stderr } = await execGt('gt deacon stale-hooks', {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      action: 'unhook-stale',
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error unhooking stale hooks:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to unhook stale hooks', details: message },
      { status: 500 }
    );
  }
}
