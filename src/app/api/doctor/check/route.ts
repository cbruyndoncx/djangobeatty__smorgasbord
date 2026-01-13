/**
 * API Route: GET /api/doctor/check
 * Run diagnostic health checks on the Gas Town workspace
 * Executes: gt doctor
 *
 * Note: gt doctor exits with non-zero when issues are found, which is expected behavior.
 * We need to capture stdout even on "error" since that contains the diagnostic output.
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Allow up to 3 minutes for doctor checks

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('gt doctor --verbose', {
      timeout: 120000, // Doctor checks can take up to 2 minutes
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    return NextResponse.json({
      success: true,
      output: stdout || 'No issues found',
      stderr: stderr || undefined,
    });
  } catch (error: unknown) {
    // gt doctor exits with non-zero when it finds issues - this is expected behavior
    // The stdout still contains the diagnostic output we want to show
    const execError = error as { stdout?: string; stderr?: string; message?: string };

    if (execError.stdout) {
      // Doctor ran but found issues - return the output
      return NextResponse.json({
        success: true,
        output: execError.stdout,
        stderr: execError.stderr || undefined,
        hasIssues: true,
      });
    }

    // Actual error (command not found, timeout, etc.)
    console.error('Error running doctor checks:', error);
    const message = execError.message || 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to run doctor checks', details: message },
      { status: 500 }
    );
  }
}
