/**
 * API Route: POST /api/witness/nudge
 * Nudges a witness for a specific rig
 * Executes: gt nudge <rig>/witness -m <message>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

const DEFAULT_NUDGE_MESSAGE = 'Dashboard nudge: Please check for updates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rig, message } = body;

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

    // Use provided message or default, escape for shell safety
    const nudgeMessage = (typeof message === 'string' && message.trim())
      ? message.trim()
      : DEFAULT_NUDGE_MESSAGE;
    const escapedMessage = nudgeMessage.replace(/'/g, "'\\''");

    const { stdout, stderr } = await execGt(
      `gt nudge ${sanitizedRig}/witness -m '${escapedMessage}'`
    );

    return NextResponse.json({
      success: true,
      rig: sanitizedRig,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error nudging witness:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check if error is due to witness not running
    const errorMsg = message.toLowerCase();
    if (errorMsg.includes('no session') || errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Witness not running. Start the witness first.', details: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to nudge witness', details: message },
      { status: 500 }
    );
  }
}
