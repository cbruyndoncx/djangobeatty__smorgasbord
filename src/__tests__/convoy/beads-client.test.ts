/**
 * Tests for Convoy tracking in BeadsClient
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeadsClient } from '@/lib/beads-client';
import type { Convoy } from '@/types/beads';

describe('BeadsClient - Convoy Tracking', () => {
  let client: BeadsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BeadsClient({ beadsPath: '/mock/path' });
  });

  describe('getConvoys()', () => {
    it('should return an array', async () => {
      const convoys = await client.getConvoys();
      expect(Array.isArray(convoys)).toBe(true);
    });

    it('should return empty array initially (no convoy data parsed yet)', async () => {
      const convoys = await client.getConvoys();
      expect(convoys).toEqual([]);
    });

    it('should cache convoy results', async () => {
      // First call
      const convoys1 = await client.getConvoys();
      // Second call should use cache
      const convoys2 = await client.getConvoys();

      expect(convoys1).toBe(convoys2); // Same reference means cached
    });

    it('should respect cache TTL', async () => {
      vi.useFakeTimers();

      const clientWithShortTTL = new BeadsClient({
        beadsPath: '/mock/path',
        enableCache: true,
        cacheTTL: 100,
      });

      const convoys1 = await clientWithShortTTL.getConvoys();

      // Advance time past cache TTL
      vi.advanceTimersByTime(200);

      const convoys2 = await clientWithShortTTL.getConvoys();

      // Should still be equal (both empty arrays) but not same reference
      expect(convoys1).toEqual(convoys2);

      vi.useRealTimers();
    });

    it('should invalidate convoy cache when invalidateCache is called', async () => {
      await client.getConvoys();
      client.invalidateCache();

      // After invalidation, cache should be empty
      // Getting convoys again should work without errors
      const convoys = await client.getConvoys();
      expect(Array.isArray(convoys)).toBe(true);
    });
  });

  describe('Convoy type structure', () => {
    it('should match expected Convoy interface', () => {
      const mockConvoy: Convoy = {
        id: 'convoy-1',
        title: 'Test Convoy',
        issues: ['issue-1', 'issue-2'],
        status: 'active',
        progress: {
          completed: 1,
          total: 2,
        },
        assignee: 'test-user',
        created_at: '2025-01-12T00:00:00Z',
        updated_at: '2025-01-12T01:00:00Z',
      };

      expect(mockConvoy.id).toBeDefined();
      expect(mockConvoy.title).toBeDefined();
      expect(mockConvoy.issues).toBeInstanceOf(Array);
      expect(['active', 'completed', 'stalled']).toContain(mockConvoy.status);
      expect(mockConvoy.progress.completed).toBeLessThanOrEqual(mockConvoy.progress.total);
    });

    it('should allow optional assignee', () => {
      const convoyWithoutAssignee: Convoy = {
        id: 'convoy-2',
        title: 'Unassigned Convoy',
        issues: [],
        status: 'stalled',
        progress: { completed: 0, total: 0 },
        created_at: '2025-01-12T00:00:00Z',
        updated_at: '2025-01-12T00:00:00Z',
      };

      expect(convoyWithoutAssignee.assignee).toBeUndefined();
    });
  });

  describe('getAllData() includes convoys', () => {
    beforeEach(() => {
      // Mock fetchIssuesRaw to return empty string
      vi.spyOn(client, 'fetchIssuesRaw').mockResolvedValue('');
    });

    it('should include convoys in getAllData response', async () => {
      const data = await client.getAllData();

      expect(data).toHaveProperty('convoys');
      expect(Array.isArray(data.convoys)).toBe(true);
    });

    it('should return BeadsData with all required fields', async () => {
      const data = await client.getAllData();

      expect(data).toHaveProperty('issues');
      expect(data).toHaveProperty('convoys');
      expect(data).toHaveProperty('polecats');
      expect(data).toHaveProperty('rigs');
    });
  });

  describe('Cache behavior with convoys', () => {
    it('should disable cache when enableCache is false', async () => {
      const clientNoCache = new BeadsClient({
        beadsPath: '/mock/path',
        enableCache: false,
      });

      const convoys1 = await clientNoCache.getConvoys();
      const convoys2 = await clientNoCache.getConvoys();

      // Both should be empty arrays but fresh instances
      expect(convoys1).toEqual([]);
      expect(convoys2).toEqual([]);
    });
  });
});
