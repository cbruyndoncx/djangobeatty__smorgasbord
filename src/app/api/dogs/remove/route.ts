/**
 * API Route: POST /api/dogs/remove
 * Remove dogs from the kennel
 * Executes: gt dog remove <name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid name parameter' },
        { status: 400 }
      );
    }

    // Sanitize dog name to prevent command injection
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedName !== name) {
      return NextResponse.json(
        { error: 'Invalid dog name' },
        { status: 400 }
      );
    }

    const { stdout, stderr } = await execGt(`gt dog remove ${sanitizedName}`, {
      timeout: 10000,
    });

    return NextResponse.json({
      success: true,
      name: sanitizedName,
      output: stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error removing dog:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to remove dog', details: message },
      { status: 500 }
    );
  }
}
