'use client';

import { cn } from '@/lib/utils';
import type { Convoy } from '@/types/beads';
import { useEffect, useRef } from 'react';

interface ConvoyContextMenuProps {
  convoy: Convoy | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onViewDetails?: (convoy: Convoy) => void;
  onNudge?: (convoy: Convoy) => void;
  onEscalate?: (convoy: Convoy) => void;
}

export function ConvoyContextMenu({
  convoy,
  position,
  onClose,
  onViewDetails,
  onNudge,
  onEscalate,
}: ConvoyContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (convoy && position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [convoy, position, onClose]);

  if (!convoy || !position) return null;

  // Adjust position to stay within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 100,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        'min-w-48 rounded-md border border-zinc-200 bg-white py-1 shadow-lg',
        'dark:border-zinc-700 dark:bg-zinc-800'
      )}
    >
      <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-700">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>⛟</span>
          <span className="font-mono">{convoy.id}</span>
        </div>
        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {convoy.title}
        </div>
      </div>

      <button
        onClick={() => {
          onViewDetails?.(convoy);
          onClose();
        }}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
          'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
        )}
      >
        <span className="w-4 text-center">👁</span>
        View details
      </button>

      {convoy.status !== 'completed' && (
        <div className="border-t border-zinc-100 dark:border-zinc-700">
          <button
            onClick={() => {
              onNudge?.(convoy);
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
              'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
            )}
          >
            <span className="w-4 text-center">👋</span>
            Nudge workers
          </button>
        </div>
      )}

      <div className="border-t border-zinc-100 dark:border-zinc-700">
        <button
          onClick={() => {
            onEscalate?.(convoy);
            onClose();
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
            'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 font-medium'
          )}
        >
          <span className="w-4 text-center">🚨</span>
          Escalate to Mayor
        </button>
      </div>
    </div>
  );
}
