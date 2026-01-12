/**
 * API Route: GET /api/mayor/status
 * Returns Mayor status including online/offline state, context usage, and session info
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MayorState, MayorStatus, MayorSessionInfo } from '@/types/mayor';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

interface GtAgent {
  name: string;
  address: string;
  session?: string;
  role: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
}

interface GtStatusOutput {
  name: string;
  agents?: GtAgent[];
  // Legacy format support
  mayor?: {
    status: string;
    session?: {
      uptime?: string;
      context_percent?: number;
      current_task?: string;
      last_activity?: string;
    };
  };
}

function parseUptime(uptimeStr: string | undefined): string {
  if (!uptimeStr) return 'N/A';
  return uptimeStr;
}

function parseLastActivity(lastActivityStr: string | undefined): string {
  if (!lastActivityStr) return 'N/A';

  try {
    const date = new Date(lastActivityStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return lastActivityStr;
  }
}

async function getMayorStatus(): Promise<MayorState> {
  try {
    // Try to get mayor status via gt status command
    const { stdout } = await execAsync('gt status --json 2>/dev/null || echo "{}"', {
      timeout: 5000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const data: GtStatusOutput = JSON.parse(stdout.trim() || '{}');

    // Look for mayor in agents array (current gt status format)
    const mayorAgent = data.agents?.find(agent => agent.name === 'mayor');

    if (mayorAgent) {
      const status: MayorStatus = mayorAgent.running ? 'online' : 'offline';

      // Build session info from available data
      const session: MayorSessionInfo = {
        uptime: 'N/A', // gt status doesn't expose uptime yet
        contextUsagePercent: 0, // gt status doesn't expose context yet
        currentTask: mayorAgent.has_work
          ? (mayorAgent.first_subject ?? 'Working')
          : null,
        lastActivity: mayorAgent.running ? 'active' : 'N/A',
      };

      return { status, session };
    }

    // Legacy format support
    if (data.mayor) {
      const mayorData = data.mayor;
      const status: MayorStatus =
        mayorData.status === 'active' || mayorData.status === 'online' ? 'online' :
        mayorData.status === 'busy' ? 'busy' : 'offline';

      const session: MayorSessionInfo | null = mayorData.session ? {
        uptime: parseUptime(mayorData.session.uptime),
        contextUsagePercent: mayorData.session.context_percent ?? 0,
        currentTask: mayorData.session.current_task ?? null,
        lastActivity: parseLastActivity(mayorData.session.last_activity),
      } : null;

      return { status, session };
    }

    return { status: 'offline', session: null };
  } catch (error) {
    console.error('Error getting mayor status:', error);

    // Return offline status on error (don't mock data)
    return { status: 'offline', session: null };
  }
}

export async function GET() {
  try {
    const mayorState = await getMayorStatus();
    return NextResponse.json(mayorState);
  } catch (error) {
    console.error('Error in mayor status endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get mayor status' },
      { status: 500 }
    );
  }
}
