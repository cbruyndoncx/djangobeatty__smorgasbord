/**
 * Tests for Convoy display in PolecatCard component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PolecatCard } from '@/components/polecat/polecat-card';
import type { Polecat } from '@/types/beads';

describe('PolecatCard - Convoy Display', () => {
  const basePolecat: Polecat = {
    id: 'polecat-1',
    name: 'Test Polecat',
    rig: 'gt_dashboard',
    status: 'active',
    hooked_work: null,
  };

  describe('Convoy field rendering', () => {
    it('should display convoy when present', () => {
      const polecatWithConvoy: Polecat = {
        ...basePolecat,
        convoy: 'feature-convoy-1',
      };

      render(<PolecatCard polecat={polecatWithConvoy} />);

      expect(screen.getByText('Convoy:')).toBeInTheDocument();
      expect(screen.getByText('feature-convoy-1')).toBeInTheDocument();
    });

    it('should not display convoy section when convoy is undefined', () => {
      const polecatWithoutConvoy: Polecat = {
        ...basePolecat,
        convoy: undefined,
      };

      render(<PolecatCard polecat={polecatWithoutConvoy} />);

      expect(screen.queryByText('Convoy:')).not.toBeInTheDocument();
    });

    it('should not display convoy section when convoy is null-ish', () => {
      const polecatNoConvoy: Polecat = {
        ...basePolecat,
      };

      render(<PolecatCard polecat={polecatNoConvoy} />);

      expect(screen.queryByText('Convoy:')).not.toBeInTheDocument();
    });
  });

  describe('Convoy styling', () => {
    it('should apply purple styling to convoy text', () => {
      const polecatWithConvoy: Polecat = {
        ...basePolecat,
        convoy: 'styled-convoy',
      };

      render(<PolecatCard polecat={polecatWithConvoy} />);

      const convoyText = screen.getByText('styled-convoy');
      expect(convoyText).toHaveClass('text-purple-400');
    });

    it('should apply gray styling to convoy label', () => {
      const polecatWithConvoy: Polecat = {
        ...basePolecat,
        convoy: 'test-convoy',
      };

      render(<PolecatCard polecat={polecatWithConvoy} />);

      const convoyLabel = screen.getByText('Convoy:');
      expect(convoyLabel).toHaveClass('text-gray-500');
    });
  });

  describe('Convoy with other fields', () => {
    it('should display convoy alongside hooked_work', () => {
      const polecatWithBoth: Polecat = {
        ...basePolecat,
        hooked_work: 'gd-123',
        convoy: 'multi-task-convoy',
      };

      render(<PolecatCard polecat={polecatWithBoth} />);

      expect(screen.getByText('Working on:')).toBeInTheDocument();
      expect(screen.getByText('gd-123')).toBeInTheDocument();
      expect(screen.getByText('Convoy:')).toBeInTheDocument();
      expect(screen.getByText('multi-task-convoy')).toBeInTheDocument();
    });

    it('should display convoy alongside branch', () => {
      const polecatWithBranchAndConvoy: Polecat = {
        ...basePolecat,
        branch: 'feature/convoy-support',
        convoy: 'branch-convoy',
      };

      render(<PolecatCard polecat={polecatWithBranchAndConvoy} />);

      expect(screen.getByText('Branch:')).toBeInTheDocument();
      expect(screen.getByText('feature/convoy-support')).toBeInTheDocument();
      expect(screen.getByText('Convoy:')).toBeInTheDocument();
      expect(screen.getByText('branch-convoy')).toBeInTheDocument();
    });

    it('should display all optional fields together', () => {
      const fullPolecat: Polecat = {
        ...basePolecat,
        hooked_work: 'gd-456',
        branch: 'feature/full-test',
        convoy: 'full-convoy',
        session_start: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      render(<PolecatCard polecat={fullPolecat} />);

      expect(screen.getByText('gd-456')).toBeInTheDocument();
      expect(screen.getByText('feature/full-test')).toBeInTheDocument();
      expect(screen.getByText('full-convoy')).toBeInTheDocument();
    });
  });

  describe('Convoy with different statuses', () => {
    const statuses = ['active', 'idle', 'spawning', 'done', 'error'] as const;

    statuses.forEach((status) => {
      it(`should display convoy for polecat with ${status} status`, () => {
        const polecat: Polecat = {
          ...basePolecat,
          status,
          convoy: `${status}-convoy`,
        };

        render(<PolecatCard polecat={polecat} />);

        expect(screen.getByText('Convoy:')).toBeInTheDocument();
        expect(screen.getByText(`${status}-convoy`)).toBeInTheDocument();
      });
    });
  });

  describe('Action buttons with convoy', () => {
    it('should still render action buttons when convoy is present', () => {
      const polecatWithConvoy: Polecat = {
        ...basePolecat,
        convoy: 'action-test-convoy',
      };

      render(<PolecatCard polecat={polecatWithConvoy} />);

      expect(screen.getByRole('button', { name: 'View Session' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nudge' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nuke' })).toBeInTheDocument();
    });

    it('should call action handlers with polecat containing convoy', () => {
      const onViewSession = vi.fn();
      const onNudge = vi.fn();
      const onNuke = vi.fn();

      const polecatWithConvoy: Polecat = {
        ...basePolecat,
        convoy: 'handler-test-convoy',
      };

      render(
        <PolecatCard
          polecat={polecatWithConvoy}
          onViewSession={onViewSession}
          onNudge={onNudge}
          onNuke={onNuke}
        />
      );

      screen.getByRole('button', { name: 'View Session' }).click();
      expect(onViewSession).toHaveBeenCalledWith(polecatWithConvoy);

      screen.getByRole('button', { name: 'Nudge' }).click();
      expect(onNudge).toHaveBeenCalledWith(polecatWithConvoy);

      screen.getByRole('button', { name: 'Nuke' }).click();
      expect(onNuke).toHaveBeenCalledWith(polecatWithConvoy);
    });
  });
});

describe('Polecat Type - Convoy Field', () => {
  it('should accept convoy as optional string', () => {
    const polecat: Polecat = {
      id: 'test-1',
      name: 'Test',
      rig: 'test-rig',
      status: 'idle',
      hooked_work: null,
      convoy: 'optional-convoy',
    };

    expect(polecat.convoy).toBe('optional-convoy');
  });

  it('should allow undefined convoy', () => {
    const polecat: Polecat = {
      id: 'test-2',
      name: 'Test',
      rig: 'test-rig',
      status: 'idle',
      hooked_work: null,
    };

    expect(polecat.convoy).toBeUndefined();
  });
});
