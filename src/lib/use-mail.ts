/**
 * React hook for mail inbox
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MailMessage, MailboxState } from '@/types/mail';

export interface UseMailboxOptions {
  address?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

export interface UseMailboxResult {
  mailbox: MailboxState;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 10000;

export function useMailbox(options: UseMailboxOptions = {}): UseMailboxResult {
  const {
    address = 'overseer',
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enabled = true
  } = options;

  const [mailbox, setMailbox] = useState<MailboxState>({ messages: [], unreadCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const response = await fetch(`/api/mail/inbox?address=${encodeURIComponent(address)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch inbox: ${response.statusText}`);
      }

      const result = await response.json();
      setMailbox({
        messages: result.messages || [],
        unreadCount: result.unreadCount || 0,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchInbox();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(fetchInbox, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchInbox]);

  return { mailbox, isLoading, error, refresh };
}
