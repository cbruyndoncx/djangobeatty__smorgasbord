/**
 * API Route: POST /api/polecats/[name]/start
 * Starts a stopped polecat session
 * Executes: gt session start <rig>/<name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface StartRequest {
  rig: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;
    const body: StartRequest = await request.json();

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
        `gt session start ${sanitizedRig}/${sanitizedName}`,
        {
          timeout: 30000, // Starting can take time
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
      console.error('gt session start command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if already running
      if (lowerError.includes('already running') || lowerError.includes('already exists')) {
        return NextResponse.json(
          {
            error: `Polecat ${polecatName} is already running`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to start polecat', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in polecat start endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process start request' },
      { status: 500 }
    );
  }
}
