/**
 * API Route: POST /api/mayor/restart
 * Restarts the Mayor agent by respawning it
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Execute gt spawn mayor command to restart the mayor
    const { stdout, stderr } = await execGt(
      'gt spawn mayor',
      {
        timeout: 15000,
        cwd: process.env.GT_BASE_PATH || process.cwd(),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Mayor restart initiated',
      output: stdout.trim(),
      error: stderr ? stderr.trim() : null,
    });
  } catch (execError) {
    console.error('Mayor restart command failed:', execError);
    const error = execError as { stdout?: string; stderr?: string; message?: string };
    const errorMessage = error.stderr || error.message || '';
    const output = error.stdout || '';

    // Handle case where mayor is already running
    const alreadyRunning = errorMessage.includes('session already running') || errorMessage.includes('already running');

    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        message: 'Mayor is already running',
        output: output.trim(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restart mayor',
        details: errorMessage || 'Unknown error',
        output: output.trim(),
      },
      { status: 500 }
    );
  }
}
