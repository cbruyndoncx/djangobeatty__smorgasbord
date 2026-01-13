/**
 * React hook for gt status data
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GtStatusOutput, GtAgent, GtStatusSummary, AgentRole } from '@/types/gt-status';

export interface UseGtStatusOptions {
  pollingInterval?: number;
  enabled?: boolean;
}

export interface UseGtStatusResult {
  status: GtStatusOutput | null;
  summary: GtStatusSummary | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 5000;

function getAgentRole(agent: GtAgent): AgentRole {
  const name = agent.name.toLowerCase();
  if (name === 'mayor') return 'mayor';
  if (name === 'deacon') return 'deacon';
  if (name.includes('witness') || agent.role === 'witness') return 'witness';
  if (agent.role === 'polecat' || name.includes('polecat')) return 'polecat';
  if (agent.role === 'crew') return 'crew';
  return 'unknown';
}

function calculateSummary(agents: GtAgent[]): GtStatusSummary {
  const byRole: GtStatusSummary['byRole'] = {};

  for (const agent of agents) {
    const role = getAgentRole(agent);

    if (!byRole[role]) {
      byRole[role] = { total: 0, running: 0, withWork: 0, unreadMail: 0 };
    }

    byRole[role]!.total++;
    if (agent.running) byRole[role]!.running++;
    if (agent.has_work) byRole[role]!.withWork++;
    byRole[role]!.unreadMail += agent.unread_mail;
  }

  return {
    totalAgents: agents.length,
    runningAgents: agents.filter(a => a.running).length,
    agentsWithWork: agents.filter(a => a.has_work).length,
    totalUnreadMail: agents.reduce((sum, a) => sum + a.unread_mail, 0),
    byRole,
  };
}

export function useGtStatus(options: UseGtStatusOptions = {}): UseGtStatusResult {
  const { pollingInterval = DEFAULT_POLLING_INTERVAL, enabled = true } = options;

  const [status, setStatus] = useState<GtStatusOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gt-status');

      if (!response.ok) {
        throw new Error(`Failed to fetch gt status: ${response.statusText}`);
      }

      const result = await response.json();
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchStatus();

    // Set up polling
    if (pollingInterval > 0) {
      intervalRef.current = setInterval(fetchStatus, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchStatus]);

  const summary = useMemo(() => {
    if (!status?.agents) return null;
    return calculateSummary(status.agents);
  }, [status]);

  return { status, summary, isLoading, error, refresh };
}
