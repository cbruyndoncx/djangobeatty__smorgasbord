'use client';

import { cn } from '@/lib/utils';
import type { Refinery, RefineryStatus } from '@/types/beads';

interface RefineryCardProps {
  refinery: Refinery;
  onProcess?: (refinery: Refinery) => void;
  onViewQueue?: (refinery: Refinery) => void;
}

const statusConfig: Record<RefineryStatus, { label: string; className: string; dotClass: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
    dotClass: 'bg-green-500 dark:bg-green-400 animate-pulse',
  },
  idle: {
    label: 'Idle',
    className: 'bg-zinc-100 dark:bg-gray-500/20 text-zinc-600 dark:text-gray-400 border-zinc-300 dark:border-gray-500/30',
    dotClass: 'bg-zinc-400 dark:bg-gray-400',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
    dotClass: 'bg-blue-500 dark:bg-blue-400 animate-pulse',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
    dotClass: 'bg-red-500 dark:bg-red-400',
  },
};

function RefineryStatusBadge({ status }: { status: RefineryStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.dotClass)} />
      {config.label}
    </span>
  );
}

export function RefineryCard({ refinery, onProcess, onViewQueue }: RefineryCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-gray-900/50 p-4 transition-all hover:bg-zinc-50 dark:hover:bg-gray-900/70 shadow-sm dark:shadow-none',
        {
          'border-green-300 dark:border-green-500/30': refinery.status === 'active',
          'border-zinc-200 dark:border-gray-700': refinery.status === 'idle',
          'border-blue-300 dark:border-blue-500/30': refinery.status === 'processing',
          'border-red-300 dark:border-red-500/30': refinery.status === 'error',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">{refinery.rig}</h3>
          <p className="text-xs text-zinc-500 dark:text-gray-500">Refinery</p>
        </div>
        <RefineryStatusBadge status={refinery.status} />
      </div>

      {/* Queue Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-gray-500">Queue Depth</span>
          <span
            className={cn('font-mono text-sm font-semibold', {
              'text-yellow-600 dark:text-yellow-400': refinery.queueDepth > 0,
              'text-zinc-500 dark:text-gray-400': refinery.queueDepth === 0,
            })}
          >
            {refinery.queueDepth} PR{refinery.queueDepth !== 1 ? 's' : ''}
          </span>
        </div>

        {refinery.currentPR && (
          <div className="text-sm">
            <span className="text-zinc-500 dark:text-gray-500">Processing: </span>
            <a
              href={refinery.currentPR.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-mono text-xs truncate"
            >
              #{refinery.currentPR.number}
            </a>
            <span className="text-zinc-600 dark:text-gray-400 ml-1 truncate">
              {refinery.currentPR.title.substring(0, 30)}
              {refinery.currentPR.title.length > 30 ? '...' : ''}
            </span>
          </div>
        )}

        {!refinery.currentPR && refinery.queueDepth === 0 && (
          <div className="text-sm text-zinc-500 dark:text-gray-500 italic">No pending PRs</div>
        )}
      </div>

      {/* Pending PRs Preview */}
      {refinery.pendingPRs.length > 0 && (
        <div className="mb-4 space-y-1">
          <span className="text-xs text-zinc-500 dark:text-gray-500 uppercase tracking-wide">Pending</span>
          <div className="space-y-1">
            {refinery.pendingPRs.slice(0, 3).map((pr) => (
              <div key={pr.number} className="text-xs text-zinc-600 dark:text-gray-400 truncate">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600/70 hover:text-blue-500 dark:text-blue-400/70 dark:hover:text-blue-300"
                >
                  #{pr.number}
                </a>
                <span className="ml-1">{pr.branch}</span>
              </div>
            ))}
            {refinery.pendingPRs.length > 3 && (
              <div className="text-xs text-zinc-500 dark:text-gray-500">
                +{refinery.pendingPRs.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-zinc-200 dark:border-gray-800">
        <button
          onClick={() => onProcess?.(refinery)}
          disabled={refinery.queueDepth === 0 || refinery.status === 'processing'}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs rounded font-medium transition-colors',
            refinery.queueDepth > 0 && refinery.status !== 'processing'
              ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-800/50 text-green-700 dark:text-green-300'
              : 'bg-zinc-100 dark:bg-gray-800 text-zinc-400 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          Process Queue
        </button>
        <button
          onClick={() => onViewQueue?.(refinery)}
          className="flex-1 px-3 py-1.5 text-xs rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-zinc-700 dark:text-gray-300 transition-colors"
        >
          View Queue
        </button>
      </div>
    </div>
  );
}
