/**
 * API Route: POST /api/deacon/force-kill
 * Force-kill an unresponsive agent session
 * Executes: gt deacon force-kill <session>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface ForceKillRequest {
  session: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ForceKillRequest = await request.json();
    const { session } = body;

    if (!session || typeof session !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid session parameter' },
        { status: 400 }
      );
    }

    // Sanitize session name to prevent command injection
    const sanitizedSession = session.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedSession !== session) {
      return NextResponse.json(
        { error: 'Invalid session name' },
        { status: 400 }
      );
    }

    const { stdout, stderr } = await execGt(`gt deacon force-kill ${sanitizedSession}`, {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      session: sanitizedSession,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error force-killing session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to force-kill session', details: message },
      { status: 500 }
    );
  }
}
