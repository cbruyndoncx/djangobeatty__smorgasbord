/**
 * API Route: POST /api/polecats/[name]/restart
 * Restarts a polecat session (kills and starts fresh)
 * Executes: gt session restart <rig>/<name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface RestartRequest {
  rig: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;
    const body: RestartRequest = await request.json();

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
        `gt session restart ${sanitizedRig}/${sanitizedName}`,
        {
          timeout: 30000, // Restart can take time
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
      console.error('gt session restart command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';

      return NextResponse.json(
        { error: 'Failed to restart polecat', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in polecat restart endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process restart request' },
      { status: 500 }
    );
  }
}
