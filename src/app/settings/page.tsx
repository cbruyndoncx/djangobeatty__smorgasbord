'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/layout';
import { useConfig } from '@/lib/use-config';
import { ProjectCard, ProjectForm, ConfirmModal } from '@/components/settings';
import type { ProjectConfig } from '@/types/config';

export default function Settings() {
  const {
    config,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    setActiveProject,
    setGtBasePath,
  } = useConfig();

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectConfig | null>(null);
  const [gtBasePathInput, setGtBasePathInput] = useState<string>('');
  const [gtBasePathDirty, setGtBasePathDirty] = useState(false);
  const [savingGtPath, setSavingGtPath] = useState(false);

  // Initialize gtBasePathInput when config loads
  useEffect(() => {
    if (!isLoading && config.gtBasePath !== undefined) {
      setGtBasePathInput(config.gtBasePath || '');
    }
  }, [isLoading, config.gtBasePath]);

  const handleGtBasePathChange = (value: string) => {
    setGtBasePathInput(value);
    setGtBasePathDirty(value !== (config.gtBasePath || ''));
  };

  const handleSaveGtBasePath = async () => {
    setSavingGtPath(true);
    try {
      await setGtBasePath(gtBasePathInput);
      setGtBasePathDirty(false);
    } catch (err) {
      console.error('Failed to save gtBasePath:', err);
    } finally {
      setSavingGtPath(false);
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: ProjectConfig) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleSaveProject = async (projectData: Omit<ProjectConfig, 'id'> & { id?: string }) => {
    try {
      if (projectData.id) {
        await updateProject(projectData as ProjectConfig);
      } else {
        await addProject(projectData);
      }
      setShowProjectForm(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleDeleteProject = (project: ProjectConfig) => {
    setDeletingProject(project);
  };

  const confirmDeleteProject = async () => {
    if (deletingProject) {
      try {
        await deleteProject(deletingProject.id);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
      setDeletingProject(null);
    }
  };

  const handleSetActive = async (project: ProjectConfig) => {
    try {
      await setActiveProject(project.id);
    } catch (err) {
      console.error('Failed to set active project:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Configure your dashboard preferences
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-red-700 dark:text-red-400">Error: {error.message}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Projects Section */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Projects</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Manage your configured projects
                </p>
              </div>
              <button
                onClick={handleAddProject}
                className="px-4 py-2 text-sm rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors"
              >
                Add Project
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-zinc-500">
                Loading projects...
              </div>
            ) : config.projects.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <p>No projects configured yet.</p>
                <p className="mt-2 text-sm">
                  Add a project to get started with the dashboard.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={config.activeProject === project.id}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onSetActive={handleSetActive}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Display Settings Section */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Display Settings
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configure the dashboard appearance and behavior
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="polling-interval"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Polling Interval (ms)
                </label>
                <input
                  type="number"
                  id="polling-interval"
                  defaultValue={config.display?.pollingInterval || 5000}
                  min={1000}
                  step={1000}
                  className="mt-1 block w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  How often to refresh data (minimum 1000ms)
                </p>
              </div>

              <div>
                <label
                  htmlFor="theme"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Theme
                </label>
                <select
                  id="theme"
                  defaultValue={config.display?.theme || 'system'}
                  className="mt-1 block w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  defaultChecked={config.display?.autoRefresh !== false}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
                />
                <label
                  htmlFor="auto-refresh"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Auto-refresh data
                </label>
              </div>
            </div>
          </div>

          {/* Gas Town Path Configuration */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Gas Town Path
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configure the path to your Gas Town root directory (contains .gt folder)
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="gt-base-path"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Gas Town Root Path
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    id="gt-base-path"
                    value={gtBasePathInput}
                    onChange={(e) => handleGtBasePathChange(e.target.value)}
                    placeholder="~/my-project or /absolute/path"
                    className="block w-full max-w-lg rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    onClick={handleSaveGtBasePath}
                    disabled={!gtBasePathDirty || savingGtPath}
                    className="px-4 py-2 text-sm rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingGtPath ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Leave empty to auto-detect from the current working directory. Supports ~ for home directory.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Info */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Configuration
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configuration file information
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">Rig Detection:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  Auto-detected from gt status
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">Version:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {config.version}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">Config path:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  ~/.mission-control/config.json
                </span>
              </div>
              {config.updatedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Last updated:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {new Date(config.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onSave={handleSaveProject}
          onCancel={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
        />
      )}

      {deletingProject && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${deletingProject.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmDeleteProject}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </div>
  );
}
