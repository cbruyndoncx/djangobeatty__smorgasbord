/**
 * API Route: GET /api/boot/status
 * Get Boot status
 * Executes: gt boot status
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt boot status', {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error getting boot status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get boot status', details: message },
      { status: 500 }
    );
  }
}
