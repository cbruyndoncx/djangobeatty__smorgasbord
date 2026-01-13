# Gas Town Kanban Dashboard - Project Context

## Mission
Build a **browser-based kanban board** for visualizing Gas Town work status. This is Gas Town dogfooding itself.

## Core Requirements

### Views
1. **Kanban Board** - Columns for issue states (backlog, in_progress, in_review, merged, closed)
2. **Convoy View** - Group issues by convoy/epic
3. **Agent View** - See what each polecat/agent is working on
4. **Timeline View** - Gantt-style view of work over time

### Data Source
- Read from Gas Town's beads database (`.beads/` directory)
- Support multiple rigs (deck_editor, gt_dashboard, etc.)
- Real-time updates via file watching or polling

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State**: React Query for data fetching
- **Drag & Drop**: @dnd-kit or react-beautiful-dnd
- **No backend needed initially** - reads beads directly from filesystem via API routes
- Could add WebSocket for real-time later

## Beads Data Model

Issues are stored in `.beads/issues.jsonl` with structure:
```json
{
  "id": "de-abc",
  "title": "Issue title",
  "type": "feature|bug|task",
  "status": "open|closed",
  "priority": "P0|P1|P2|P3",
  "labels": ["gt:in-progress", "gt:merge-request"],
  "assignee": "polecat/name",
  "convoy": "convoy-id",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z"
}
```

## Key Labels for Kanban
- `gt:backlog` - Not started
- `gt:in-progress` - Being worked on
- `gt:merge-request` - PR submitted
- `gt:merged` - Merged to main
- No label + closed = Done

## MVP Features (Track 1)
1. Parse beads JSONL files
2. Basic kanban board with drag-drop (read-only first)
3. Filter by rig
4. Filter by assignee
5. Search issues

## Future Features (Track 2)
1. Real-time updates
2. Convoy grouping
3. Agent activity timeline
4. Write-back (create/update issues from UI)
5. Multi-workspace support

## File Structure
```
src/
├── components/
│   ├── Board.tsx
│   ├── Column.tsx
│   ├── Card.tsx
│   └── Filters.tsx
├── lib/
│   ├── beads.ts      # Parse beads files
│   └── types.ts      # TypeScript types
├── stores/
│   └── issues.ts     # Zustand store
└── App.tsx
```

## Reference
- Gas Town repo: https://github.com/steveyegge/gastown
- Beads CLI: `bd list`, `bd show <id>`
