'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MayorState, MayorStatus } from '@/types/mayor';
import { useMayorStatus } from '@/lib/use-mayor';

interface StatusIndicatorProps {
  status: MayorStatus;
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const config: Record<MayorStatus, { label: string; className: string; dotClass: string }> = {
    online: {
      label: 'Online',
      className: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
      dotClass: 'bg-green-500 dark:bg-green-400 animate-pulse',
    },
    offline: {
      label: 'Offline',
      className: 'bg-zinc-100 dark:bg-gray-500/20 text-zinc-600 dark:text-gray-400 border-zinc-300 dark:border-gray-500/30',
      dotClass: 'bg-zinc-400 dark:bg-gray-400',
    },
    busy: {
      label: 'Busy',
      className: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
      dotClass: 'bg-yellow-500 dark:bg-yellow-400 animate-pulse',
    },
  };

  const { label, className, dotClass } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotClass)} />
      {label}
    </span>
  );
}

interface ContextUsageBarProps {
  percent: number;
}

function ContextUsageBar({ percent }: ContextUsageBarProps) {
  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500 dark:text-gray-400">Context Usage</span>
        <span className={cn(
          'font-mono',
          percent >= 90 ? 'text-red-600 dark:text-red-400' : percent >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
        )}>
          {percent}%
        </span>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(percent))}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function MayorPanel() {
  const { mayorState, isLoading, error, refresh, sendNudge } = useMayorStatus();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendNudge = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    setNudgeStatus(null);

    try {
      await sendNudge(message.trim());
      setNudgeStatus({ type: 'success', message: 'Nudge sent successfully' });
      setMessage('');
    } catch (err) {
      setNudgeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send nudge',
      });
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, sendNudge]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendNudge();
    }
  };

  const handleRestartMayor = useCallback(async () => {
    setIsRestarting(true);
    setNudgeStatus(null);

    try {
      const response = await fetch('/api/mayor/restart', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to restart mayor');
      }

      setNudgeStatus({ type: 'success', message: data.message || 'Mayor restart initiated' });

      // Refresh status after a delay
      setTimeout(() => {
        refresh();
      }, 2000);
    } catch (err) {
      setNudgeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to restart mayor',
      });
    } finally {
      setIsRestarting(false);
    }
  }, [refresh]);

  if (isLoading && !mayorState) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 dark:border-gray-400 border-t-transparent" />
          <span className="text-zinc-500 dark:text-gray-400">Loading Mayor status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-500/30 bg-white dark:bg-gray-900/50 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-red-600 dark:text-red-400">Failed to load Mayor status</span>
          <button
            onClick={refresh}
            className="px-3 py-1 text-xs rounded bg-zinc-100 dark:bg-gray-800 hover:bg-zinc-200 dark:hover:bg-gray-700 text-zinc-700 dark:text-gray-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = mayorState?.status ?? 'offline';
  const session = mayorState?.session;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-gray-900/50 p-6 transition-all shadow-sm dark:shadow-none',
        {
          'border-green-300 dark:border-green-500/30': status === 'online',
          'border-zinc-200 dark:border-gray-700': status === 'offline',
          'border-yellow-300 dark:border-yellow-500/30': status === 'busy',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Mayor</h2>
          <StatusIndicator status={status} />
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-zinc-500 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          title="Refresh status"
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

      {/* Context Usage */}
      {session && (
        <div className="mb-6">
          <ContextUsageBar percent={session.contextUsagePercent} />
        </div>
      )}

      {/* Session Info */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500 dark:text-gray-500">Uptime</span>
            <p className="text-zinc-900 dark:text-white font-mono">{session?.uptime ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-gray-500">Last Activity</span>
            <p className="text-zinc-900 dark:text-white font-mono">{session?.lastActivity ?? 'N/A'}</p>
          </div>
        </div>
        {session?.currentTask && (
          <div className="text-sm">
            <span className="text-zinc-500 dark:text-gray-500">Current Task</span>
            <p className="text-orange-600 dark:text-orange-400 font-mono text-xs mt-1 truncate">
              {session.currentTask}
            </p>
          </div>
        )}
      </div>

      {/* Offline Alert + Restart Button */}
      {status === 'offline' && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">Mayor is offline</span>
            </div>
            <button
              onClick={handleRestartMayor}
              disabled={isRestarting}
              className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
            >
              {isRestarting ? 'Restarting...' : 'Restart Mayor'}
            </button>
          </div>
        </div>
      )}

      {/* Nudge Input */}
      <div className="border-t border-zinc-200 dark:border-gray-800 pt-4">
        <label className="block text-xs text-zinc-500 dark:text-gray-500 mb-2">
          Send Nudge {status === 'offline' && <span className="text-red-600 dark:text-red-400">(Mayor offline)</span>}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'offline' ? 'Mayor is offline' : 'Type a message for Mayor...'}
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-zinc-300 dark:border-gray-700 rounded text-sm text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            disabled={isSending || status === 'offline'}
          />
          <button
            onClick={handleSendNudge}
            disabled={!message.trim() || isSending || status === 'offline'}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded transition-colors',
              message.trim() && !isSending && status !== 'offline'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-gray-800 text-zinc-400 dark:text-gray-500 cursor-not-allowed'
            )}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
        {nudgeStatus && (
          <p
            className={cn(
              'mt-2 text-xs',
              nudgeStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {nudgeStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
