/**
 * API Route: POST /api/convoys/[id]/nudge
 * Nudges all workers associated with a convoy
 * Executes: gt nudge <worker-name> for each worker on convoy issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: convoyId } = await params;

    if (!convoyId) {
      return NextResponse.json(
        { error: 'Convoy ID is required' },
        { status: 400 }
      );
    }

    // Get convoy status to find all issues in the convoy
    const { stdout: convoyStdout } = await execGt(`gt convoy status ${convoyId} --json`, {
      timeout: 10000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const convoy = JSON.parse(convoyStdout.trim());

    if (!convoy || !convoy.tracked || convoy.tracked.length === 0) {
      return NextResponse.json({
        message: 'No issues found in convoy',
        nudged_count: 0,
      });
    }

    const issueIds = convoy.tracked.map((t: any) => t.id);

    // Get status to find which workers are working on these issues
    const { stdout: statusStdout } = await execGt('gt status --json', {
      timeout: 10000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const status = JSON.parse(statusStdout.trim());
    const polecats = status.polecats || [];

    // Find workers who have hooked work matching convoy issues
    const workersToNudge = new Set<string>();

    for (const polecat of polecats) {
      if (polecat.hooked_work && issueIds.includes(polecat.hooked_work)) {
        workersToNudge.add(polecat.name);
      }
    }

    if (workersToNudge.size === 0) {
      return NextResponse.json({
        message: 'No workers currently assigned to convoy issues',
        nudged_count: 0,
      });
    }

    // Nudge each worker
    const nudgePromises = Array.from(workersToNudge).map(async (workerName) => {
      try {
        await execGt(`gt nudge ${workerName}`, {
          timeout: 5000,
          cwd: process.env.GT_BASE_PATH || process.cwd(),
        });
        return { worker: workerName, success: true };
      } catch (error) {
        console.error(`Failed to nudge ${workerName}:`, error);
        return { worker: workerName, success: false };
      }
    });

    const results = await Promise.all(nudgePromises);
    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Nudged ${successCount} of ${workersToNudge.size} worker(s) for convoy ${convoy.title}`,
      nudged_count: successCount,
      total_workers: workersToNudge.size,
      workers: Array.from(workersToNudge),
    });

  } catch (error) {
    console.error('Error in convoy nudge endpoint:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to nudge convoy workers', details: errorMsg },
      { status: 500 }
    );
  }
}
