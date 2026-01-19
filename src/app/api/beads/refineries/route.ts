/**
 * API Route: GET /api/beads/refineries
 * Returns refinery status for all rigs in Gas Town
 * Uses gt mq list for queue data (no gh CLI dependency)
 */

import { NextResponse } from 'next/server';
import { getBeadsReader } from '@/lib/beads-reader';
import type { Issue, Refinery, RefineryStatus, AgentState, RoleType } from '@/types/beads';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

function parseJsonl<T>(content: string): T[] {
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

interface MergeQueueResult {
  count: number;
  items: { id: string; title?: string; branch?: string }[];
}

/**
 * Get the actual merge queue from GT
 * Parses table output like:
 *   📋 Merge queue for 'editor_gt5':
 *   ID             SCORE PRI  CONVOY       BRANCH                   STATUS        AGE
 *   ─────────────────────────────────────────────────────────────────────────────────
 *   e5-pmc7       1202.8 P2   (none)       crew/Emma5               ready          2h
 */
async function getMergeQueue(rigName: string): Promise<MergeQueueResult> {
  try {
    const { stdout } = await execGt(`gt mq list ${rigName}`, { timeout: 5000 });
    const lines = stdout.split('\n');
    const items: MergeQueueResult['items'] = [];
    for (const line of lines) {
      // Match data rows: ID (e.g., e5-pmc7) followed by other columns
      // Skip header line, separator line, and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('ID') || trimmed.startsWith('─') || trimmed.startsWith('📋')) {
        continue;
      }
      // Parse: ID  SCORE PRI  CONVOY  BRANCH  STATUS  AGE
      const match = trimmed.match(/^(\S+)\s+[\d.]+\s+\S+\s+\S+\s+(\S+)\s+(\S+)/);
      if (match) {
        items.push({
          id: match[1],      // e.g., "e5-pmc7"
          branch: match[2],  // e.g., "crew/Emma5"
          title: match[3],   // status as title for now, e.g., "ready"
        });
      }
    }
    return { count: items.length, items };
  } catch (error) {
    console.error(`Error getting merge queue for ${rigName}:`, error);
    return { count: 0, items: [] };
  }
}

function parseRefineryFromIssue(issue: Issue): Partial<Refinery> | null {
  if (issue.issue_type !== 'agent') return null;

  const desc = issue.description;
  const getField = (field: string): string | null => {
    const match = desc.match(new RegExp(`${field}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  const roleType = getField('role_type') as RoleType;
  if (roleType !== 'refinery') return null;

  const agentState = (getField('agent_state') as AgentState) ?? 'idle';

  // Map agent state to refinery status
  let status: RefineryStatus = 'idle';
  if (agentState === 'active') {
    status = 'processing';
  } else if (agentState === 'error') {
    status = 'error';
  } else if (agentState === 'idle') {
    status = 'idle';
  }

  return {
    id: issue.id,
    name: issue.title,
    rig: getField('rig') ?? '',
    status,
    agent_state: agentState,
  };
}

export async function GET() {
  try {
    const reader = getBeadsReader();
    const content = await reader.getIssuesRaw();
    const issues = parseJsonl<Issue>(content);
    const rigNames = await reader.getRigNames();

    // Extract refinery agents from issues
    const refineryPartials = issues
      .map((issue) => parseRefineryFromIssue(issue))
      .filter((r): r is Partial<Refinery> => r !== null);

    // Fetch merge queue data for all rigs in parallel
    const queueResults = await Promise.all(
      rigNames.map(rigName => getMergeQueue(rigName))
    );

    // Build refineries with queue data only (no gh dependency)
    const refineries: Refinery[] = rigNames.map((rigName, index) => {
      const existingRefinery = refineryPartials.find((r) => r.rig === rigName);
      const queueResult = queueResults[index];

      return {
        id: existingRefinery?.id ?? `refinery-${rigName}`,
        name: existingRefinery?.name ?? `${rigName} Refinery`,
        rig: rigName,
        status: existingRefinery?.status ?? 'idle',
        queueDepth: queueResult.count,
        queueItems: queueResult.items,
        currentPR: null,
        pendingPRs: [],
        lastProcessedAt: null,
        agent_state: existingRefinery?.agent_state ?? 'idle',
        unread_mail: existingRefinery?.unread_mail ?? 0,
      };
    });

    return NextResponse.json({
      refineries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching refineries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refineries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/beads/refineries
 * Trigger gt mq process for a specific rig
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rig, action } = body;

    if (!rig) {
      return NextResponse.json(
        { error: 'rig is required' },
        { status: 400 }
      );
    }

    if (action === 'process') {
      // Execute gt mq process
      const basePath = process.env.GT_BASE_PATH ?? process.cwd();
      const { stdout, stderr } = await execGt(`gt mq process`, {
        cwd: `${basePath}/${rig}`,
      });

      return NextResponse.json({
        success: true,
        rig,
        action,
        output: stdout,
        error: stderr || null,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing refinery action:', error);
    return NextResponse.json(
      { error: 'Failed to process refinery action' },
      { status: 500 }
    );
  }
}
