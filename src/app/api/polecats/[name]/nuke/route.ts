/**
 * API Route: POST /api/polecats/[name]/nuke
 * Completely destroys a polecat (session, worktree, branch, agent bead)
 * Executes: gt polecat nuke <rig>/<name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface NukeRequest {
  rig: string;
  force?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;
    const body: NukeRequest = await request.json();

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
      const forceFlag = body.force ? ' --force' : '';
      const { stdout, stderr } = await execGt(
        `gt polecat nuke ${sanitizedRig}/${sanitizedName}${forceFlag}`,
        {
          timeout: 30000, // Nuke can take longer
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
      console.error('gt polecat nuke command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if error is due to safety checks
      if (
        lowerError.includes('uncommitted') ||
        lowerError.includes('unpushed') ||
        lowerError.includes('merge request') ||
        lowerError.includes('work on hook') ||
        lowerError.includes('safety check')
      ) {
        return NextResponse.json(
          {
            error: `Safety check failed for ${polecatName}. The polecat has uncommitted work, unpushed changes, or active merge requests.`,
            details: errorMsg,
            canForce: true,
          },
          { status: 400 }
        );
      }

      // Check if polecat not found
      if (lowerError.includes('not found') || lowerError.includes('does not exist')) {
        return NextResponse.json(
          {
            error: `Polecat ${polecatName} not found in rig ${body.rig}`,
            details: errorMsg,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to nuke polecat', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in polecat nuke endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process nuke request' },
      { status: 500 }
    );
  }
}
