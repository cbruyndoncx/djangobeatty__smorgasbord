/**
 * API Route: GET /api/dogs/list
 * List all dogs in the kennel
 * Executes: gt dog list
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout, stderr } = await execGt('gt dog list', {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error listing dogs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list dogs', details: message },
      { status: 500 }
    );
  }
}
