'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AgentStatus {
  name: string;
  address: string;
  session: string;
  role: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
}

interface RigStatus {
  name: string;
  polecats: string[];
  polecat_count: number;
  has_witness: boolean;
  has_refinery: boolean;
  agents: AgentStatus[];
}

interface GasTownStatusData {
  name: string;
  location: string;
  rigs: RigStatus[];
}

export function GasTownStatus() {
  const [status, setStatus] = useState<GasTownStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error('Failed to fetch Gas Town status');
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !status) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span className="text-zinc-500">Loading Gas Town status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 shadow-sm">
        <div className="text-red-600 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!status || !status.rigs) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="text-zinc-500">
          No Gas Town status available. The gt status command may be timing out or the daemon may not be running.
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalRigs = status.rigs.length;
  const totalPolecats = status.rigs.reduce((sum, rig) => sum + rig.polecat_count, 0);
  const activePolecats = status.rigs.reduce(
    (sum, rig) => sum + rig.agents.filter(a => a.role === 'polecat' && a.running && a.has_work).length,
    0
  );
  const totalWitnesses = status.rigs.filter(r => r.has_witness).length;
  const activeWitnesses = status.rigs.reduce(
    (sum, rig) => sum + rig.agents.filter(a => a.role === 'witness' && a.running).length,
    0
  );
  const totalUnreadMail = status.rigs.reduce(
    (sum, rig) => sum + rig.agents.reduce((s, a) => s + (a.unread_mail || 0), 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header with Summary Stats */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {status.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              {status.location}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalRigs}</p>
              <p className="text-xs text-zinc-500">Rigs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{activePolecats}</p>
              <p className="text-xs text-zinc-500">Active Workers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{activeWitnesses}/{totalWitnesses}</p>
              <p className="text-xs text-zinc-500">Witnesses</p>
            </div>
            {totalUnreadMail > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{totalUnreadMail}</p>
                <p className="text-xs text-zinc-500">Unread Mail</p>
              </div>
            )}
          </div>
        </div>

        {/* Rigs Hierarchical View */}
        <div className="space-y-3">
          {status.rigs.map((rig) => {
            const rigCrew = rig.agents.filter(a => a.role === 'crew');
            const rigPolecats = rig.agents.filter(a => a.role === 'polecat');
            const rigWitness = rig.agents.find(a => a.role === 'witness');
            const rigRefinery = rig.agents.find(a => a.role === 'refinery');
            const activeCount = rigPolecats.filter(p => p.running && p.has_work).length;

            // Sort polecats: active first, then with mail, then idle, then stopped
            const sortedPolecats = [...rigPolecats].sort((a, b) => {
              // Active with work first
              if (a.running && a.has_work && !(b.running && b.has_work)) return -1;
              if (!(a.running && a.has_work) && b.running && b.has_work) return 1;
              // Then by unread mail count
              if (a.unread_mail !== b.unread_mail) return b.unread_mail - a.unread_mail;
              // Then running vs stopped
              if (a.running && !b.running) return -1;
              if (!a.running && b.running) return 1;
              // Finally alphabetical
              return a.name.localeCompare(b.name);
            });

            return (
              <div
                key={rig.name}
                className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4 py-2"
              >
                {/* Rig Name */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {rig.name}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      {activeCount}/{rig.polecat_count} active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rig.has_witness && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded",
                        rigWitness?.running
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                      )}>
                        Witness {rigWitness?.running ? '✓' : '✗'}
                      </span>
                    )}
                    {rig.has_refinery && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded",
                        rigRefinery?.running
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                      )}>
                        Refinery {rigRefinery?.running ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Crew (persistent agents) */}
                {rigCrew.length > 0 && (
                  <div className="ml-4 mb-3">
                    <div className="text-xs text-zinc-500 dark:text-zinc-600 mb-1">Crew</div>
                    <div className="space-y-1">
                      {rigCrew.map((crew) => (
                        <div
                          key={crew.address}
                          className="flex items-center gap-2 text-sm font-mono"
                        >
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              crew.running && crew.has_work
                                ? 'bg-green-500'
                                : crew.running
                                ? 'bg-blue-500'
                                : 'bg-zinc-500'
                            )}
                          />
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {crew.name}
                          </span>
                          {crew.unread_mail > 0 && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                              {crew.unread_mail} mail
                            </span>
                          )}
                          {crew.has_work && (
                            <span className="text-xs text-blue-400">
                              {crew.first_subject || 'available'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Polecats (sorted: active first, then by mail) */}
                {rigPolecats.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {sortedPolecats.map((polecat) => (
                      <div
                        key={polecat.address}
                        className="flex items-center gap-2 text-sm font-mono"
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            polecat.running && polecat.has_work
                              ? 'bg-green-500'
                              : polecat.running
                              ? 'bg-zinc-500'
                              : 'bg-red-500'
                          )}
                        />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {polecat.name}
                        </span>
                        {polecat.unread_mail > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                            {polecat.unread_mail} mail
                          </span>
                        )}
                        {polecat.has_work && (
                          <span className="text-xs text-green-400">
                            {polecat.first_subject || 'working'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
