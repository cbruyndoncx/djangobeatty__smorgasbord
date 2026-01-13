/**
 * API Route: POST /api/polecats/[name]/stop
 * Stops a running polecat session
 * Executes: gt session stop <rig>/<name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface StopRequest {
  rig: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;
    const body: StopRequest = await request.json();

    if (!polecatName) {
      return NextResponse.json(
        { error: 'Polecat name is required' },
        { status: 400 }
      );
    }

    if (!body.rig || typeof body.rig !== 'string') {
      return NextResponse.json(
        { error: 'Rig is required' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent command injection
    const sanitizedRig = body.rig.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedName = polecatName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedRig !== body.rig || sanitizedName !== polecatName) {
      return NextResponse.json(
        { error: 'Invalid rig or polecat name' },
        { status: 400 }
      );
    }

    try {
      const { stdout, stderr } = await execGt(
        `gt session stop ${sanitizedRig}/${sanitizedName}`,
        {
          timeout: 15000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        name: polecatName,
        rig: body.rig,
        output: stdout,
        stderr: stderr || undefined,
      });
    } catch (execError) {
      console.error('gt session stop command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if already stopped
      if (lowerError.includes('not running') || lowerError.includes('not found')) {
        return NextResponse.json(
          {
            error: `Polecat ${polecatName} is not running`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to stop polecat', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in polecat stop endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process stop request' },
      { status: 500 }
    );
  }
}
