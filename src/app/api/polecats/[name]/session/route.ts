/**
 * API Route: GET /api/polecats/[name]/session
 * Returns the tmux session output for a polecat
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface SessionOutput {
  name: string;
  output: string;
  timestamp: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: polecatName } = await params;

    if (!polecatName) {
      return NextResponse.json(
        { error: 'Polecat name is required' },
        { status: 400 }
      );
    }

    // Try to capture the tmux pane for this polecat
    // Using tmux capture-pane to get the session output
    try {
      const { stdout } = await execGt(
        `tmux capture-pane -ep -t ${polecatName}`,
        {
          timeout: 5000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        }
      );

      const sessionOutput: SessionOutput = {
        name: polecatName,
        output: stdout || '(No output available)',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(sessionOutput);
    } catch (tmuxError) {
      // If tmux capture fails, try alternative method
      console.error('tmux capture-pane failed:', tmuxError);

      return NextResponse.json({
        name: polecatName,
        output: `Unable to capture session for ${polecatName}.\n\nThe polecat may not have an active tmux session.\n\nYou can attach manually using: gt attach ${polecatName}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error fetching polecat session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
