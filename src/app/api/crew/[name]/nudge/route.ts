/**
 * API Route: POST /api/crew/[name]/nudge
 * Sends a nudge message to a crew member
 * Executes: gt nudge <rig>/<name> -m <message>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface NudgeRequest {
  message: string;
  rig: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: crewName } = await params;
    const body: NudgeRequest = await request.json();

    if (!crewName) {
      return NextResponse.json(
        { error: 'Crew member name is required' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!body.rig || typeof body.rig !== 'string') {
      return NextResponse.json(
        { error: 'Rig is required' },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    if (message.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent command injection
    const sanitizedRig = body.rig.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedName = crewName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedRig !== body.rig || sanitizedName !== crewName) {
      return NextResponse.json(
        { error: 'Invalid rig or crew member name' },
        { status: 400 }
      );
    }

    // Escape message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");

    try {
      const { stdout, stderr } = await execGt(
        `gt nudge ${sanitizedRig}/${sanitizedName} -m '${escapedMessage}'`,
        {
          timeout: 10000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      return NextResponse.json({
        success: true,
        name: crewName,
        rig: body.rig,
        output: stdout,
        stderr: stderr || undefined,
      });
    } catch (execError) {
      console.error('gt nudge command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if error is due to crew member not running
      if (
        lowerError.includes('no session') ||
        lowerError.includes('not found') ||
        lowerError.includes('does not exist')
      ) {
        return NextResponse.json(
          {
            error: `Crew member ${crewName} is not running. Cannot send nudge to stopped crew members.`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to nudge crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew nudge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process nudge request' },
      { status: 500 }
    );
  }
}
