'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PullRequest {
  number: number;
  title: string;
  branch: string;
  author: string;
  createdAt?: string;
  url?: string;
}

interface Refinery {
  rig: string;
  queueDepth: number;
  currentPR: PullRequest | null;
  pendingPRs?: PullRequest[];
  status: 'idle' | 'processing' | 'error';
}

export function CompactRefineriesPanel() {
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRefineries = useCallback(async () => {
    try {
      const response = await fetch('/api/beads/refineries');
      if (!response.ok) return;
      const data = await response.json();
      setRefineries(data.refineries || []);
    } catch (err) {
      console.error('Failed to fetch refineries:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefineries();
    const interval = setInterval(fetchRefineries, 10000);
    return () => clearInterval(interval);
  }, [fetchRefineries]);

  const handleProcess = async (rig: string) => {
    setProcessing(rig);
    try {
      const response = await fetch('/api/beads/refineries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig, action: 'process' }),
      });

      if (response.ok) {
        await fetchRefineries();
      }
    } catch (err) {
      console.error('Failed to process queue:', err);
    } finally {
      setProcessing(null);
    }
  };

  const totalInQueue = refineries.reduce((sum, r) => sum + r.queueDepth, 0);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Refineries
        </h3>
        <span className="text-xs text-zinc-500">
          {totalInQueue} PR{totalInQueue !== 1 ? 's' : ''} in queue
        </span>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500">Loading...</div>
      ) : refineries.length === 0 ? (
        <div className="text-xs text-zinc-500">No refineries configured</div>
      ) : (
        <div className="space-y-2">
          {refineries.map((refinery) => (
          <div
            key={refinery.rig}
            className="rounded bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden"
          >
            {/* Refinery header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    refinery.status === 'processing' ? 'bg-purple-500 animate-pulse' :
                    refinery.status === 'error' ? 'bg-red-500' :
                    refinery.queueDepth > 0 ? 'bg-blue-500' :
                    'bg-zinc-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {refinery.rig}
                    </span>
                    {refinery.queueDepth > 0 ? (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                        {refinery.queueDepth} PR{refinery.queueDepth > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">Idle</span>
                    )}
                  </div>
                </div>
              </div>
              {refinery.queueDepth > 0 && (
                <button
                  onClick={() => handleProcess(refinery.rig)}
                  disabled={processing === refinery.rig}
                  className="px-3 py-1 text-xs rounded bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {processing === refinery.rig ? 'Processing...' : 'Process'}
                </button>
              )}
            </div>

            {/* PR Queue - Show ALL PRs (current + pending) */}
            {refinery.queueDepth > 0 && (
              <div className="px-3 pb-3 space-y-1 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                {/* Current PR */}
                {refinery.currentPR && (
                  <div className="text-xs p-2 rounded bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded font-mono">
                        #{refinery.currentPR.number}
                      </span>
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                        Processing
                      </span>
                    </div>
                    <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {refinery.currentPR.title}
                    </div>
                    <div className="text-zinc-500 mt-1 flex items-center gap-2">
                      <span>{refinery.currentPR.author}</span>
                      <span>•</span>
                      <span className="font-mono">{refinery.currentPR.branch}</span>
                    </div>
                  </div>
                )}

                {/* Pending PRs */}
                {refinery.pendingPRs && refinery.pendingPRs.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-500 font-semibold mt-2 mb-1">
                      Pending ({refinery.pendingPRs.length})
                    </div>
                    {refinery.pendingPRs.map((pr) => (
                      <div
                        key={pr.number}
                        className="text-xs p-2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 bg-zinc-500/30 text-zinc-400 rounded font-mono">
                            #{pr.number}
                          </span>
                        </div>
                        <div className="text-zinc-700 dark:text-zinc-300">
                          {pr.title}
                        </div>
                        <div className="text-zinc-500 mt-1 flex items-center gap-2">
                          <span>{pr.author}</span>
                          <span>•</span>
                          <span className="font-mono">{pr.branch}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
