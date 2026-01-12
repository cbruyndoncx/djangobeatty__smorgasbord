/**
 * API Route: PATCH /api/beads/issues/[id]/status
 * Updates the status of a bead using the bd CLI
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { IssueStatus } from '@/types/beads';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

const validStatuses: IssueStatus[] = ['open', 'hooked', 'in_progress', 'blocked', 'closed'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const basePath = process.env.GT_BASE_PATH ?? process.cwd();
    let command: string;

    // Map status to bd CLI commands
    if (status === 'closed') {
      command = reason ? `bd close ${id} --reason "${reason}"` : `bd close ${id}`;
    } else if (status === 'open') {
      command = `bd reopen ${id}`;
    } else {
      command = `bd set-state ${id} status=${status}`;
    }

    const { stdout, stderr } = await execAsync(command, { cwd: basePath });

    return NextResponse.json({
      success: true,
      id,
      status,
      output: stdout || null,
      error: stderr || null,
    });
  } catch (error) {
    console.error('Error updating bead status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update bead status', details: errorMessage },
      { status: 500 }
    );
  }
}
