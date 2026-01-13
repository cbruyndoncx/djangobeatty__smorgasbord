'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useIssues, useConvoys } from '@/lib/use-beads';
import { KanbanBoard, IssueDetailModal } from '@/components/kanban';
import { ConvoyList, ConvoyContextMenu, ConvoyDetailModal } from '@/components/convoy';
import { NavBar } from '@/components/layout';
import { AlertModal } from '@/components/settings';
import type { Issue, IssueStatus, Convoy } from '@/types/beads';

export default function WorkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { issues, isLoading: issuesLoading, error: issuesError, refresh: refreshIssues } = useIssues();
  const { convoys, isLoading: convoysLoading, error: convoysError } = useConvoys();
  const [selectedConvoy, setSelectedConvoy] = useState<Convoy | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stalled' | 'completed'>('all');
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenuConvoy, setContextMenuConvoy] = useState<Convoy | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Escalation modal state
  const [escalateConvoy, setEscalateConvoy] = useState<Convoy | null>(null);
  const [escalateMessage, setEscalateMessage] = useState('');

  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const isLoading = issuesLoading || convoysLoading;
  const error = issuesError || convoysError;

  // Handle URL parameters to auto-open convoy or issue
  useEffect(() => {
    if (isLoading) return;

    const convoyId = searchParams.get('convoy');
    const issueId = searchParams.get('issue');

    if (convoyId && !selectedConvoy) {
      const convoy = convoys.find(c => c.id === convoyId);
      if (convoy) {
        setSelectedConvoy(convoy);
      }
    }

    if (issueId && !selectedIssue) {
      const issue = issues.find(i => i.id === issueId);
      if (issue) {
        setSelectedIssue(issue);
        setHighlightedIssueId(issueId);
      }
    }
  }, [searchParams, convoys, issues, isLoading, selectedConvoy, selectedIssue]);

  // Filter convoys based on search and status
  const filteredConvoys = convoys.filter((convoy) => {
    const matchesSearch = convoy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         convoy.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || convoy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Convoy stats (based on filtered results)
  const activeCount = filteredConvoys.filter((c) => c.status === 'active').length;
  const stalledCount = filteredConvoys.filter((c) => c.status === 'stalled').length;
  const completedCount = filteredConvoys.filter((c) => c.status === 'completed').length;

  const totalIssues = filteredConvoys.reduce((sum, c) => sum + c.progress.total, 0);
  const completedIssues = filteredConvoys.reduce((sum, c) => sum + c.progress.completed, 0);
  const overallProgress = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  const handleStatusChange = useCallback(
    async (issue: Issue, newStatus: IssueStatus) => {
      try {
        const response = await fetch(`/api/beads/issues/${issue.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to update status:', errorData);
          return;
        }

        refreshIssues();
      } catch (error) {
        console.error('Error updating bead status:', error);
      }
    },
    [refreshIssues]
  );

  const handleSelectConvoy = (convoy: Convoy) => {
    setSelectedConvoy(convoy);
  };

  const handleNudge = async (convoy: Convoy) => {
    try {
      const response = await fetch(`/api/convoys/${convoy.id}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to nudge workers:', errorData);
        setAlertModal({
          title: 'Nudge Failed',
          message: errorData.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }

      const result = await response.json();
      console.log('Nudge result:', result);
      setAlertModal({
        title: 'Workers Nudged',
        message: result.message || `Nudged ${result.nudged_count || 0} worker(s) for convoy ${convoy.title}`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error nudging workers:', error);
      setAlertModal({
        title: 'Nudge Failed',
        message: 'Failed to nudge workers. Check console for details.',
        variant: 'error',
      });
    }
  };

  const handleConvoyContextMenu = useCallback((e: React.MouseEvent, convoy: Convoy) => {
    e.preventDefault();
    setContextMenuConvoy(convoy);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuConvoy(null);
    setContextMenuPosition(null);
  }, []);

  const handleEscalateFromMenu = useCallback((convoy: Convoy) => {
    setEscalateConvoy(convoy);
  }, []);

  const handleSendEscalation = useCallback(async () => {
    if (!escalateConvoy) return;

    try {
      const response = await fetch(`/api/convoys/${escalateConvoy.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: escalateMessage.trim() || undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to escalate convoy:', errorData);
        setAlertModal({
          title: 'Escalation Failed',
          message: errorData.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }

      const result = await response.json();
      console.log('Escalate result:', result);
      setAlertModal({
        title: 'Convoy Escalated',
        message: result.message || `Escalated convoy "${escalateConvoy.title}" to mayor`,
        variant: 'success',
      });

      setEscalateConvoy(null);
      setEscalateMessage('');
    } catch (error) {
      console.error('Error escalating convoy:', error);
      setAlertModal({
        title: 'Escalation Failed',
        message: 'Failed to escalate convoy. Check console for details.',
        variant: 'error',
      });
    }
  }, [escalateConvoy, escalateMessage]);

  const handleIssueClickFromConvoy = useCallback((issue: Issue) => {
    setSelectedConvoy(null); // Close convoy modal
    setSelectedIssue(issue); // Open issue modal
    router.push(`/work?issue=${issue.id}`); // Update URL to issue parameter
  }, [router]);

  const handleViewInKanban = useCallback(() => {
    setSelectedIssue(null); // Close issue modal
    router.push('/work'); // Clear URL parameters

    // Scroll to the kanban board section
    if (kanbanRef.current) {
      kanbanRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Highlight the issue briefly (keep the highlightedIssueId from selectedIssue)
    if (selectedIssue) {
      setHighlightedIssueId(selectedIssue.id);

      // Find and scroll to the specific issue card
      setTimeout(() => {
        const issueCard = document.querySelector(`[data-issue-id="${selectedIssue.id}"]`);
        if (issueCard) {
          issueCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedIssueId(null);
        }, 3000);
      }, 500); // Wait for kanban section to scroll first
    }
  }, [selectedIssue, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Convoys Section */}
        {(convoysLoading || convoys.length > 0) && (
          <div className="mb-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Convoy Tracking
                </h2>
                {!convoysLoading && (searchQuery || statusFilter !== 'all') ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Showing {filteredConvoys.length} of {convoys.length}
                  </p>
                ) : null}
              </div>

              {/* Summary Stats */}
              {convoysLoading ? (
                <div className="flex items-center gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse text-center">
                      <div className="mx-auto h-8 w-12 rounded bg-zinc-300 dark:bg-zinc-700" />
                      <div className="mt-1 h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-600" />
                    </div>
                  ))}
                </div>
              ) : !error && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {filteredConvoys.length}
                    </p>
                    <p className="text-zinc-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                    <p className="text-zinc-500">Active</p>
                  </div>
                  {stalledCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">
                        {stalledCount}
                      </p>
                      <p className="text-zinc-500">Stalled</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      {completedCount}
                    </p>
                    <p className="text-zinc-500">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {overallProgress}%
                    </p>
                    <p className="text-zinc-500">Progress</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-4 flex items-center gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search convoys by title or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-100 dark:bg-blue-500 text-blue-700 dark:text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-green-100 dark:bg-green-500 text-green-700 dark:text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('stalled')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    statusFilter === 'stalled'
                      ? 'bg-amber-200 dark:bg-amber-500 text-amber-800 dark:text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  Stalled
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-purple-200 dark:bg-purple-500 text-purple-800 dark:text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Convoy List */}
            {convoysLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 w-3/4 rounded bg-zinc-300 dark:bg-zinc-700" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-600" />
                      </div>
                      <div className="h-6 w-20 rounded bg-zinc-200 dark:bg-zinc-600" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ConvoyList
                convoys={filteredConvoys}
                issues={issues}
                onSelectConvoy={handleSelectConvoy}
                onConvoyContextMenu={handleConvoyContextMenu}
              />
            )}
          </div>
        )}

        {/* Convoy Context Menu */}
        <ConvoyContextMenu
          convoy={contextMenuConvoy}
          position={contextMenuPosition}
          onClose={handleCloseContextMenu}
          onViewDetails={(convoy) => setSelectedConvoy(convoy)}
          onNudge={handleNudge}
          onEscalate={handleEscalateFromMenu}
        />

        {/* Convoy Detail Modal */}
        <ConvoyDetailModal
          convoy={selectedConvoy}
          issues={issues}
          onClose={() => {
            setSelectedConvoy(null);
            router.push('/work');
          }}
          onNudge={handleNudge}
          onEscalate={handleEscalateFromMenu}
          onIssueClick={handleIssueClickFromConvoy}
        />

        {/* Escalation Modal */}
        {escalateConvoy && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setEscalateConvoy(null);
              setEscalateMessage('');
            }}
          >
            <div
              className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Escalate to Mayor
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Convoy: {escalateConvoy.title}
              </p>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Optional Message
              </label>
              <textarea
                value={escalateMessage}
                onChange={(e) => setEscalateMessage(e.target.value)}
                placeholder="Add context about why this needs attention..."
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                rows={4}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSendEscalation}
                  className="flex-1 px-4 py-2 text-sm rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors font-medium"
                >
                  Send Escalation
                </button>
                <button
                  onClick={() => {
                    setEscalateConvoy(null);
                    setEscalateMessage('');
                  }}
                  className="flex-1 px-4 py-2 text-sm rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Work Status Section */}
        <div ref={kanbanRef} className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Beads
            </h2>
          </div>
          <button
            onClick={() => refreshIssues()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
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
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            Error loading issues: {error.message}
          </div>
        )}

        {isLoading && issues.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Loading issues...
              </p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            issues={issues}
            onStatusChange={handleStatusChange}
            highlightedIssueId={highlightedIssueId}
            selectedIssue={selectedIssue}
            onSelectIssue={setSelectedIssue}
          />
        )}

        {/* Issue Detail Modal - with View in Kanban button */}
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => {
            setSelectedIssue(null);
            router.push('/work');
          }}
          onViewInKanban={handleViewInKanban}
        />
      </main>

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}
