/**
 * API Route: GET /api/deacon
 * Returns gt deacon status including:
 * - Running/stopped status from gt status --json
 * - Session name (tmux session)
 * - Agent state
 * - Unread mail count
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface GtAgent {
  name: string;
  address: string;
  session: string;
  role: string;
  running: boolean;
  has_work: boolean;
  state: string;
  unread_mail: number;
  first_subject?: string;
}

interface GtStatusOutput {
  name: string;
  location: string;
  agents: GtAgent[];
}

interface DeaconStatus {
  alive: boolean;
  session: string | null;
  role: string | null;
  state: string | null;
  has_work: boolean;
  unread_mail: number;
  // Keep these for compatibility with the panel
  pid: number | null;
  version: string | null;
  started_at: string | null;
  uptime_seconds: number | null;
  interval: string;
  last_activity: string | null;
  recent_logs: string[];
  error_logs: string[];
}

export async function GET() {
  try {
    const status: DeaconStatus = {
      alive: false,
      session: null,
      role: null,
      state: null,
      has_work: false,
      unread_mail: 0,
      pid: null,
      version: null,
      started_at: null,
      uptime_seconds: null,
      interval: 'N/A',
      last_activity: null,
      recent_logs: [],
      error_logs: [],
    };

    try {
      // Get deacon status from gt status --json
      const { stdout } = await execGt('gt status --json 2>/dev/null || echo "{}"', {
        timeout: 10000,
      });

      const gtStatus: GtStatusOutput = JSON.parse(stdout.trim() || '{}');

      // Find the deacon agent - check both name and role
      const deacon = gtStatus.agents?.find(
        (a) => a.name === 'deacon' || a.role === 'health-check' || a.role === 'deacon'
      );

      if (deacon) {
        status.alive = deacon.running;
        status.session = deacon.session;
        status.role = deacon.role;
        status.state = deacon.state;
        status.has_work = deacon.has_work;
        status.unread_mail = deacon.unread_mail;
      }
    } catch (parseError) {
      console.error('Failed to get gt deacon status:', parseError);
      // Return default status on error
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching deacon status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deacon status' },
      { status: 500 }
    );
  }
}
