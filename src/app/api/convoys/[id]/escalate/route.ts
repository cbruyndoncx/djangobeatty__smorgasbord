/**
 * API Route: POST /api/convoys/[id]/escalate
 * Escalates a convoy to the mayor's attention
 * Sends mail to mayor with convoy context and optional user message
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
    const body = await request.json();
    const { message } = body;

    if (!convoyId) {
      return NextResponse.json(
        { error: 'Convoy ID is required' },
        { status: 400 }
      );
    }

    // Get convoy details for context
    const { stdout: convoyStdout } = await execGt(`gt convoy status ${convoyId} --json`, {
      timeout: 10000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const convoy = JSON.parse(convoyStdout.trim());

    // Build escalation message
    const subject = `🚨 Escalation: ${convoy.title}`;

    let mailBody = `Convoy "${convoy.title}" (${convoyId}) has been escalated and requires your attention.\n\n`;
    mailBody += `Status: ${convoy.status || 'Unknown'}\n`;
    mailBody += `Progress: ${convoy.completed || 0}/${convoy.total || 0} issues completed\n`;

    if (convoy.tracked && convoy.tracked.length > 0) {
      mailBody += `\nTracked Issues:\n`;
      convoy.tracked.forEach((issue: any) => {
        mailBody += `  - ${issue.id}: ${issue.title || 'No title'}\n`;
      });
    }

    if (message && message.trim()) {
      mailBody += `\nAdditional Context:\n${message.trim()}\n`;
    }

    // Send mail to mayor
    const mailCommand = `gt mail send mayor --subject "${subject.replace(/"/g, '\\"')}" --body "${mailBody.replace(/"/g, '\\"')}"`;

    try {
      await execGt(mailCommand, {
        timeout: 5000,
        cwd: process.env.GT_BASE_PATH || process.cwd(),
      });
    } catch (mailError) {
      console.error('Failed to send mail to mayor:', mailError);
      return NextResponse.json(
        { error: 'Failed to send escalation to mayor', details: mailError instanceof Error ? mailError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Convoy "${convoy.title}" escalated to mayor`,
      convoy_id: convoyId,
    });

  } catch (error) {
    console.error('Error in convoy escalate endpoint:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to escalate convoy', details: errorMsg },
      { status: 500 }
    );
  }
}
