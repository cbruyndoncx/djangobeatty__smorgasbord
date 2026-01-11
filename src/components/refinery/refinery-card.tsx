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
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    dotClass: 'bg-green-400 animate-pulse',
  },
  idle: {
    label: 'Idle',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    dotClass: 'bg-gray-400',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-400 animate-pulse',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dotClass: 'bg-red-400',
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
        'rounded-lg border bg-gray-900/50 p-4 transition-all hover:bg-gray-900/70',
        {
          'border-green-500/30': refinery.status === 'active',
          'border-gray-700': refinery.status === 'idle',
          'border-blue-500/30': refinery.status === 'processing',
          'border-red-500/30': refinery.status === 'error',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{refinery.rig}</h3>
          <p className="text-xs text-gray-500">Refinery</p>
        </div>
        <RefineryStatusBadge status={refinery.status} />
      </div>

      {/* Queue Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Queue Depth</span>
          <span
            className={cn('font-mono text-sm font-semibold', {
              'text-yellow-400': refinery.queueDepth > 0,
              'text-gray-400': refinery.queueDepth === 0,
            })}
          >
            {refinery.queueDepth} PR{refinery.queueDepth !== 1 ? 's' : ''}
          </span>
        </div>

        {refinery.currentPR && (
          <div className="text-sm">
            <span className="text-gray-500">Processing: </span>
            <a
              href={refinery.currentPR.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono text-xs truncate"
            >
              #{refinery.currentPR.number}
            </a>
            <span className="text-gray-400 ml-1 truncate">
              {refinery.currentPR.title.substring(0, 30)}
              {refinery.currentPR.title.length > 30 ? '...' : ''}
            </span>
          </div>
        )}

        {!refinery.currentPR && refinery.queueDepth === 0 && (
          <div className="text-sm text-gray-500 italic">No pending PRs</div>
        )}
      </div>

      {/* Pending PRs Preview */}
      {refinery.pendingPRs.length > 0 && (
        <div className="mb-4 space-y-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Pending</span>
          <div className="space-y-1">
            {refinery.pendingPRs.slice(0, 3).map((pr) => (
              <div key={pr.number} className="text-xs text-gray-400 truncate">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400/70 hover:text-blue-300"
                >
                  #{pr.number}
                </a>
                <span className="ml-1">{pr.branch}</span>
              </div>
            ))}
            {refinery.pendingPRs.length > 3 && (
              <div className="text-xs text-gray-500">
                +{refinery.pendingPRs.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <button
          onClick={() => onProcess?.(refinery)}
          disabled={refinery.queueDepth === 0 || refinery.status === 'processing'}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs rounded font-medium transition-colors',
            refinery.queueDepth > 0 && refinery.status !== 'processing'
              ? 'bg-green-900/50 hover:bg-green-800/50 text-green-300'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          )}
        >
          Process Queue
        </button>
        <button
          onClick={() => onViewQueue?.(refinery)}
          className="flex-1 px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          View Queue
        </button>
      </div>
    </div>
  );
}
