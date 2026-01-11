/**
 * Tests for useConvoys hook
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useConvoys, useBeads } from '@/lib/use-beads';
import type { Convoy, BeadsData } from '@/types/beads';

describe('useConvoys Hook', () => {
  const mockConvoys: Convoy[] = [
    {
      id: 'convoy-1',
      title: 'Feature Convoy',
      issues: ['issue-1', 'issue-2', 'issue-3'],
      status: 'active',
      progress: { completed: 1, total: 3 },
      assignee: 'polecat-1',
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-12T00:00:00Z',
    },
    {
      id: 'convoy-2',
      title: 'Bug Fix Convoy',
      issues: ['issue-4'],
      status: 'completed',
      progress: { completed: 1, total: 1 },
      created_at: '2025-01-11T00:00:00Z',
      updated_at: '2025-01-12T00:00:00Z',
    },
  ];

  const mockBeadsData: BeadsData = {
    issues: [],
    convoys: mockConvoys,
    polecats: [],
    rigs: [],
  };

  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockBeadsData,
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return convoys from API', async () => {
      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.convoys).toEqual(mockConvoys);
    });

    it('should return empty array when no convoys', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ issues: [], convoys: [], polecats: [], rigs: [] }),
      } as Response);

      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.convoys).toEqual([]);
    });

    it('should handle undefined convoys gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ issues: [], polecats: [], rigs: [] }), // No convoys field
      } as Response);

      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.convoys).toEqual([]);
    });
  });

  describe('Loading state', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useConvoys());

      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading false after data fetch', async () => {
      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.convoys).toEqual([]);
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('Refresh functionality', () => {
    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should refetch data when refresh is called', async () => {
      const { result } = renderHook(() => useConvoys());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialFetchCount = vi.mocked(global.fetch).mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(vi.mocked(global.fetch).mock.calls.length).toBeGreaterThan(initialFetchCount);
    });
  });
});

describe('useBeads Hook - Convoy Integration', () => {
  const mockBeadsData: BeadsData = {
    issues: [],
    convoys: [
      {
        id: 'convoy-1',
        title: 'Test Convoy',
        issues: [],
        status: 'active',
        progress: { completed: 0, total: 1 },
        created_at: '2025-01-12T00:00:00Z',
        updated_at: '2025-01-12T00:00:00Z',
      },
    ],
    polecats: [],
    rigs: [],
  };

  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockBeadsData,
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should include convoys in data response', async () => {
    const { result } = renderHook(() => useBeads({ pollingInterval: 0 }));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data?.convoys).toBeDefined();
    expect(result.current.data?.convoys.length).toBe(1);
  });

  it('should not poll when disabled', async () => {
    renderHook(() => useBeads({ enabled: false }));

    // Wait a small amount
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });
});
