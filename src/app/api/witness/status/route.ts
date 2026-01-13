/**
 * API Route: POST /api/witness/status
 * Get witness status for a specific rig
 * Executes: gt witness status <rig>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rig } = body;

    if (!rig || typeof rig !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rig parameter' },
        { status: 400 }
      );
    }

    // Sanitize rig name to prevent command injection
    const sanitizedRig = rig.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedRig !== rig) {
      return NextResponse.json(
        { error: 'Invalid rig name' },
        { status: 400 }
      );
    }

    const { stdout, stderr } = await execGt(`gt witness status ${sanitizedRig}`, {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      rig: sanitizedRig,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error getting witness status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get witness status', details: message },
      { status: 500 }
    );
  }
}
