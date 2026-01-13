/**
 * API Route: GET /api/mail/inbox
 * Get inbox for the overseer (human user)
 */

import { NextResponse } from 'next/server';
import type { MailMessage } from '@/types/mail';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface InboxResponse {
  messages: MailMessage[];
  unreadCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || 'overseer';

    // Use gt mail inbox command
    const { stdout } = await execGt(
      `gt mail inbox ${address} --json 2>/dev/null || gt mail inbox ${address} 2>/dev/null || echo "[]"`,
      {
        timeout: 10000,
        cwd: process.env.GT_BASE_PATH || process.cwd(),
      }
    );

    let messages: MailMessage[] = [];
    let unreadCount = 0;

    try {
      // Try parsing as JSON first (if gt supports --json)
      const parsed = JSON.parse(stdout.trim() || '[]');
      if (Array.isArray(parsed)) {
        messages = parsed.map((msg: any, idx: number) => ({
          id: msg.id || `msg-${idx}`,
          from: msg.from || 'unknown',
          to: msg.to || address,
          subject: msg.subject || '(no subject)',
          body: msg.body || msg.content || '',
          timestamp: msg.timestamp || msg.date || new Date().toISOString(),
          read: msg.read ?? !msg.unread,
        }));
        unreadCount = messages.filter(m => !m.read).length;
      }
    } catch {
      // Parse text format
      const lines = stdout.split('\n').filter((l: string) => l.trim());

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Try to parse various mail formats
        // Format 1: [unread] from: subject
        const match1 = line.match(/^\s*(\[unread\])?\s*(\S+):\s*(.+)/);
        if (match1) {
          const isUnread = !!match1[1];
          if (isUnread) unreadCount++;
          messages.push({
            id: `msg-${i}`,
            from: match1[2],
            to: address,
            subject: match1[3],
            body: '',
            timestamp: new Date().toISOString(),
            read: !isUnread,
          });
          continue;
        }

        // Format 2: ID | From | Subject | Date
        const match2 = line.match(/^\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.+?)\s*\|\s*(.+)/);
        if (match2) {
          messages.push({
            id: match2[1],
            from: match2[2],
            to: address,
            subject: match2[3],
            body: '',
            timestamp: match2[4],
            read: true,
          });
        }
      }
    }

    const response: InboxResponse = {
      messages,
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching mail inbox:', error);
    // Return empty inbox on error
    return NextResponse.json({
      messages: [],
      unreadCount: 0,
    });
  }
}
