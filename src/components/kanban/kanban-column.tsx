'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme-provider';
import type { Issue } from '@/types/beads';
import { IssueCard } from './issue-card';
import { Loader2 } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: string;
  issues: Issue[];
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onIssueClick?: (issue: Issue) => void;
  onIssueDragStart?: (e: React.DragEvent, issue: Issue) => void;
  onIssueContextMenu?: (e: React.MouseEvent, issue: Issue) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: string) => void;
  isDropTarget?: boolean;
  highlightedIssueId?: string | null;
}

const columnConfig: Record<string, { color: string; bgColor: string }> = {
  open: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  in_progress: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  blocked: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  closed: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
};

export function KanbanColumn({
  title,
  status,
  issues,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onIssueClick,
  onIssueDragStart,
  onIssueContextMenu,
  onDragOver,
  onDrop,
  isDropTarget,
  highlightedIssueId,
}: KanbanColumnProps) {
  const { theme } = useTheme();
  const isKawaii = theme === 'smorgasbord';
  const config = columnConfig[status] || columnConfig.open;
  const parentRef = useRef<HTMLDivElement>(null);

  // Kawaii icons for each status
  const kawaiiIcons: Record<string, string> = {
    open: '📋',
    in_progress: '⚡',
    blocked: '🚧',
    closed: '✅',
  };

  // Infinite scroll: detect when user scrolls near bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || isLoadingMore || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollThreshold = 200; // pixels from bottom to trigger load

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const scrollContainer = parentRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Display count: show total if available, otherwise loaded count
  const displayCount = total !== undefined ? total : issues.length;

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50',
        'min-h-[500px] transition-all',
        isDropTarget && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-950'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(e, status);
      }}
    >
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-zinc-200 px-3 py-2',
          'dark:border-zinc-800',
          config.bgColor
        )}
      >
        <h3
          className={cn(
            'text-sm font-semibold uppercase tracking-wide flex items-center gap-1.5',
            config.color
          )}
        >
          {isKawaii && <span>{kawaiiIcons[status] || '📌'}</span>}
          {title}
        </h3>
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
            config.bgColor,
            config.color
          )}
          title={hasMore ? `Showing ${issues.length} of ${displayCount}` : undefined}
        >
          {displayCount}
        </span>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-2"
      >
        {issues.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
            No items
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={onIssueClick}
                onDragStart={onIssueDragStart}
                onContextMenu={onIssueContextMenu}
                isHighlighted={highlightedIssueId === issue.id}
              />
            ))}

            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Load more hint */}
            {hasMore && !isLoadingMore && (
              <div className="flex items-center justify-center py-2">
                <span className="text-xs text-muted-foreground">
                  Scroll for more ({issues.length} of {displayCount})
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
