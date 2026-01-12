'use client';

import { useState, useEffect } from 'react';
import type { ProjectConfig } from '@/types/config';

interface ProjectFormProps {
  project?: ProjectConfig | null;
  onSave: (project: Omit<ProjectConfig, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [beadsPath, setBeadsPath] = useState('');
  const [gtPath, setGtPath] = useState('');
  const [prefix, setPrefix] = useState('');
  const [repo, setRepo] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setBeadsPath(project.beadsPath);
      setGtPath(project.gtPath || '');
      setPrefix(project.prefix || '');
      setRepo(project.repo || '');
    } else {
      setName('');
      setBeadsPath('');
      setGtPath('');
      setPrefix('');
      setRepo('');
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !beadsPath.trim()) return;

    onSave({
      id: project?.id,
      name: name.trim(),
      beadsPath: beadsPath.trim(),
      gtPath: gtPath.trim() || undefined,
      prefix: prefix.trim() || undefined,
      repo: repo.trim() || undefined,
      active: project?.active,
    });
  };

  const isEditing = !!project;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {isEditing ? 'Edit Project' : 'Add Project'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Project Name
            </label>
            <input
              type="text"
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="beads-path"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Beads Path
            </label>
            <input
              type="text"
              id="beads-path"
              value={beadsPath}
              onChange={(e) => setBeadsPath(e.target.value)}
              placeholder="/path/to/project/.beads"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              Path to the .beads directory for this project
            </p>
          </div>

          <div>
            <label
              htmlFor="gt-path"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Gas Town Path (optional)
            </label>
            <input
              type="text"
              id="gt-path"
              value={gtPath}
              onChange={(e) => setGtPath(e.target.value)}
              placeholder="/path/to/project/.gt"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Path to .gt directory (for full Gas Town features)
            </p>
          </div>

          <div>
            <label
              htmlFor="prefix"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Issue Prefix (optional)
            </label>
            <input
              type="text"
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="gt-"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="repo"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              GitHub Repository (optional)
            </label>
            <input
              type="text"
              id="repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
