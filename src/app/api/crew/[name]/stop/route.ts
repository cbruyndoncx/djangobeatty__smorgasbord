/**
 * API Route: POST /api/crew/[name]/stop
 * Stops a running crew member or HQ agent
 * Executes: gt crew stop <name> OR gt <agent> stop for HQ agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

// HQ-level agents that use gt <agent> stop instead of gt crew stop
const HQ_AGENTS = ['mayor', 'deacon', 'witness', 'refinery'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: crewName } = await params;
    const body = await request.json().catch(() => ({}));
    const { rig } = body;

    if (!crewName) {
      return NextResponse.json(
        { error: 'Crew member name is required' },
        { status: 400 }
      );
    }

    // Sanitize name
    const sanitizedName = crewName.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedName !== crewName) {
      return NextResponse.json(
        { error: 'Invalid crew member name' },
        { status: 400 }
      );
    }

    // Determine command based on agent type
    let command: string;
    if (HQ_AGENTS.includes(sanitizedName.toLowerCase())) {
      // HQ agents use gt <agent> stop
      command = `gt ${sanitizedName.toLowerCase()} stop`;
    } else {
      // Crew members need rig
      if (!rig) {
        return NextResponse.json(
          { error: 'Rig is required for crew members' },
          { status: 400 }
        );
      }
      const sanitizedRig = rig.replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedRig !== rig) {
        return NextResponse.json(
          { error: 'Invalid rig name' },
          { status: 400 }
        );
      }
      command = `gt crew stop ${sanitizedName} --rig ${sanitizedRig}`;
    }

    try {
      const { stdout, stderr } = await execGt(
        command,
        {
          timeout: 15000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        name: crewName,
        output: stdout,
        stderr: stderr || undefined,
      });
    } catch (execError) {
      console.error('gt crew stop command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if already stopped
      if (lowerError.includes('not running') || lowerError.includes('not found')) {
        return NextResponse.json(
          {
            error: `Crew member ${crewName} is not running`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to stop crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew stop endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process stop request' },
      { status: 500 }
    );
  }
}
