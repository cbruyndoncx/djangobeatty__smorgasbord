/**
 * API Route: POST /api/crew/[name]/refresh
 * Refreshes a crew member's context (mail-to-self handoff)
 * Executes: gt crew refresh <name>
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
        `gt crew refresh ${sanitizedName}`,
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
      console.error('gt crew refresh command failed:', execError);
      const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
      const lowerError = errorMsg.toLowerCase();

      // Check if not running
      if (lowerError.includes('not running') || lowerError.includes('not found')) {
        return NextResponse.json(
          {
            error: `Crew member ${crewName} is not running. Start it first.`,
            details: errorMsg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to refresh crew member', details: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in crew refresh endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process refresh request' },
      { status: 500 }
    );
  }
}
