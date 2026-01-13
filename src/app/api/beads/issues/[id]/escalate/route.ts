/**
 * API Route: POST /api/beads/issues/[id]/escalate
 * Escalates an issue/bead to the mayor's attention
 * Sends mail to mayor with issue context and optional user message
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: issueId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    // Get issue details from beads database
    const { stdout: issueStdout } = await execGt(`gt log --query "id == '${issueId}'" --json`, {
      timeout: 10000,
      cwd: process.env.GT_BASE_PATH || process.cwd(),
    });

    const issues = JSON.parse(issueStdout.trim());
    if (!issues || issues.length === 0) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = issues[0];

    // Build escalation message
    const subject = `🚨 Escalation: ${issue.title}`;

    let mailBody = `Issue "${issue.title}" (${issueId}) has been escalated and requires your attention.\n\n`;
    mailBody += `Status: ${issue.status || 'Unknown'}\n`;
    mailBody += `Priority: P${issue.priority !== undefined ? issue.priority : '?'}\n`;

    if (issue.assignee) {
      mailBody += `Assigned to: ${issue.assignee}\n`;
    }

    if (issue.description) {
      mailBody += `\nDescription:\n${issue.description}\n`;
    }

    if (issue.dependencies && issue.dependencies.length > 0) {
      mailBody += `\nDependencies:\n`;
      issue.dependencies.forEach((dep: string) => {
        mailBody += `  - ${dep}\n`;
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
      message: `Issue "${issue.title}" escalated to mayor`,
      issue_id: issueId,
    });

  } catch (error) {
    console.error('Error in issue escalate endpoint:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to escalate issue', details: errorMsg },
      { status: 500 }
    );
  }
}
