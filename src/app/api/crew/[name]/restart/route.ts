/**
 * API Route: POST /api/crew/[name]/restart
 * Restarts a crew member (kills and starts fresh)
 * Executes: gt crew restart <name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: crewName } = await params;

    if (!crewName) {
      return NextResponse.json(
        { error: 'Crew member name is required' },
        { status: 400 }
      );
    }

    // Sanitize input to prevent command injection
    const sanitizedName = crewName.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitizedName !== crewName) {
      return NextResponse.json(
        { error: 'Invalid crew member name' },
        { status: 400 }
      );
    }

    try {
      const { stdout, stderr } = await execGt(
        `gt crew restart ${sanitizedName}`,
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
