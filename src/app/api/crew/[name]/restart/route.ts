/**
 * API Route: POST /api/crew/[name]/restart
 * Restarts a crew member or HQ agent (kills and starts fresh)
 * Executes: gt crew restart <name> OR gt <agent> restart for HQ agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

// HQ-level agents that use gt <agent> restart instead of gt crew restart
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
      // HQ agents use gt <agent> restart
      command = `gt ${sanitizedName.toLowerCase()} restart`;
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
      command = `gt crew restart ${sanitizedName} --rig ${sanitizedRig}`;
    }

    try {
      const { stdout, stderr } = await execGt(
        command,
        {
          timeout: 30000, // Restart can take time
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
      console.error('gt crew restart command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';

      return NextResponse.json(
        { error: 'Failed to restart crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew restart endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process restart request' },
      { status: 500 }
    );
  }
}
