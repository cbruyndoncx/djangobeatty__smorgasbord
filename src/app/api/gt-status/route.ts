/**
 * API Route: GET /api/gt-status
 * Returns full gt status output including all agents
 */

import { NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';
import type { GtStatusOutput, GtAgent } from '@/types/gt-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { stdout } = await execGt('gt status --json 2>/dev/null || echo "[]"', {
      timeout: 5000,
    });

    // gt status --json returns an array of agents
    let agents: GtAgent[] = [];
    let name = 'Gas Town';

    try {
      const parsed = JSON.parse(stdout.trim() || '[]');

      // Handle both array format and object format
      if (Array.isArray(parsed)) {
        agents = parsed;
      } else if (parsed.agents) {
        agents = parsed.agents;
        name = parsed.name || name;
      }
    } catch (parseError) {
      console.error('Failed to parse gt status output:', parseError);
      // Return empty agents on parse error
    }

    const response: GtStatusOutput = {
      name,
      agents,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error running gt status:', error);
    return NextResponse.json(
      { error: 'Failed to get gt status', name: 'Gas Town', agents: [] },
      { status: 500 }
    );
  }
}
