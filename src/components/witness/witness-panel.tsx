'use client';

import React from 'react';
import { useWitnesses } from '@/lib/use-beads';
import { cn } from '@/lib/utils';
import type { Witness } from '@/types/beads';

export function WitnessPanel() {
  const { witnesses, isLoading, error, refresh } = useWitnesses();
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nudging, setNudging] = React.useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleNudge = async (witness: Witness) => {
    setNudging(witness.rig);
    try {
      const response = await fetch('/api/witness/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig: witness.rig }),
      });
      const result = await response.json();
      if (!response.ok) {
        showFeedback('error', `Nudge failed: ${result.error}`);
      } else {
        const message = result.output?.trim() || `Nudged ${witness.rig} witness`;
        showFeedback('success', message);
        refresh();
      }
    } catch (err) {
      showFeedback('error', 'Failed to send nudge');
    } finally {
      setNudging(null);
    }
  };

  const handleStart = async (witness: Witness) => {
    try {
      const response = await fetch('/api/witness/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig: witness.rig }),
      });
      const result = await response.json();
      if (!response.ok) {
        showFeedback('error', `Start failed: ${result.error}`);
      } else {
        const message = result.output?.trim() || `Started ${witness.rig} witness`;
        showFeedback('success', message);
        refresh();
      }
    } catch (err) {
      showFeedback('error', 'Failed to start witness');
    }
  };

  // Summary stats
  const activeCount = witnesses.filter((w) => w.status === 'active').length;
  const idleCount = witnesses.filter((w) => w.status === 'idle').length;
  const stoppedCount = witnesses.filter((w) => w.status === 'stopped').length;
  const totalUnreadMail = witnesses.reduce((sum, w) => sum + w.unread_mail, 0);

  if (isLoading && witnesses.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span className="text-zinc-500">Loading witnesses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 shadow-sm">
        <div className="text-red-600 dark:text-red-400">
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Patrols (Witnesses)
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
              {activeCount} active
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
              {idleCount} idle
            </span>
            {stoppedCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {stoppedCount} stopped
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={cn('w-4 h-4', isLoading && 'animate-spin')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={cn(
          'mb-4 rounded p-3 text-sm',
          feedback.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        )}>
          {feedback.message}
        </div>
      )}

      {/* Witnesses List */}
      {witnesses.length === 0 ? (
        <p className="text-center text-zinc-500 py-4">No witnesses found</p>
      ) : (
        <div className="space-y-2">
          {witnesses.map((witness) => (
            <div
              key={witness.id}
              className="flex items-center justify-between p-3 rounded bg-zinc-50 dark:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    witness.status === 'active' ? 'bg-green-500' :
                    witness.status === 'idle' ? 'bg-zinc-500' :
                    'bg-orange-500'
                  )}
                />
                <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {witness.rig}
                </span>
                {witness.unread_mail > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                    {witness.unread_mail} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {witness.status === 'stopped' ? (
                  <button
                    onClick={() => handleStart(witness)}
                    className="px-3 py-1 text-xs rounded bg-green-900/50 hover:bg-green-800/50 text-green-300 transition-colors"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => handleNudge(witness)}
                    disabled={nudging === witness.rig}
                    className="px-3 py-1 text-xs rounded bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 transition-colors disabled:opacity-50"
                  >
                    {nudging === witness.rig ? 'Nudging...' : 'Nudge'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All Link */}
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <a
          href="/witnesses"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all witnesses →
        </a>
      </div>
    </div>
  );
}
