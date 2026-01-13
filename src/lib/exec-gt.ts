/**
 * Utility for executing gt/bd commands from API routes
 * Ensures PATH includes /usr/local/bin and /opt/homebrew/bin
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);

interface ExecGtOptions {
  timeout?: number;
  cwd?: string;
}

const DEFAULT_TIMEOUT = 10000;
const CONFIG_PATH = join(homedir(), '.mission-control', 'config.json');

// Cache the detected/configured Gas Town root
let cachedGtRoot: string | null = null;

// Cache for gt status --json results
interface StatusCache {
  data: unknown;
  timestamp: number;
}
let statusCache: StatusCache | null = null;
let statusFetchPromise: Promise<unknown> | null = null;
const STATUS_CACHE_TTL = 5000; // 5 second TTL to match beads polling interval

/**
 * Read configuration from config file
 */
function getConfig(): { gtBasePath: string | null; binPaths: string[] } {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content);

      let gtBasePath: string | null = null;
      if (config.gtBasePath && typeof config.gtBasePath === 'string') {
        // Expand ~ to home directory
        if (config.gtBasePath.startsWith('~')) {
          gtBasePath = join(homedir(), config.gtBasePath.slice(1));
        } else {
          gtBasePath = config.gtBasePath;
        }
      }

      const binPaths = Array.isArray(config.binPaths)
        ? config.binPaths.map((p: string) => p.startsWith('~') ? join(homedir(), p.slice(1)) : p)
        : [];

      return { gtBasePath, binPaths };
    }
  } catch {
    // Ignore config read errors
  }
  return { gtBasePath: null, binPaths: [] };
}

/**
 * Find the Gas Town root directory by walking up from the current directory
 * looking for a .gt directory
 */
function findGtRoot(startPath: string = process.cwd(), maxLevels: number = 10): string | null {
  let currentPath = startPath;

  for (let i = 0; i < maxLevels; i++) {
    const gtPath = join(currentPath, '.gt');
    if (existsSync(gtPath)) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached filesystem root
      break;
    }
    currentPath = parentPath;
  }

  return null;
}

/**
 * Get the Gas Town root directory
 * Priority: 1) GT_BASE_PATH env var, 2) Config file, 3) Auto-detect, 4) cwd
 */
function getGtRoot(): string {
  // Check env var first (for CI/deployment overrides)
  if (process.env.GT_BASE_PATH) {
    return process.env.GT_BASE_PATH;
  }

  // Use cached value if available
  if (cachedGtRoot) {
    return cachedGtRoot;
  }

  // Check config file
  const { gtBasePath } = getConfig();
  if (gtBasePath && existsSync(join(gtBasePath, '.gt'))) {
    cachedGtRoot = gtBasePath;
    return gtBasePath;
  }

  // Try to detect from current directory
  const detected = findGtRoot();
  if (detected) {
    cachedGtRoot = detected;
    return detected;
  }

  // Fallback to current directory
  return process.cwd();
}

/**
 * Execute a gt or bd command with proper PATH configuration
 * Commands are run from the Gas Town root to ensure gt/bd commands work correctly
 */
export async function execGt(
  command: string,
  options: ExecGtOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = DEFAULT_TIMEOUT, cwd } = options;

  // Get configured bin paths from config
  const { binPaths } = getConfig();

  // Prepend configured bin paths to environment PATH
  // This allows users to configure where gt/bd/node are installed
  const extendedPath = binPaths.length > 0
    ? [...binPaths, process.env.PATH || ''].join(':')
    : process.env.PATH || '';

  // Use provided cwd, or auto-detect Gas Town root
  const workingDir = cwd || getGtRoot();

  return execAsync(command, {
    timeout,
    cwd: workingDir,
    env: {
      ...process.env,
      PATH: extendedPath,
    },
  });
}

/**
 * Execute gt status --json and return parsed result
 * Caches results for 5 seconds to match beads polling interval
 */
export async function getGtStatus<T = unknown>(): Promise<T | null> {
  const now = Date.now();

  // Return cached result if fresh (< 5 seconds old)
  if (statusCache && (now - statusCache.timestamp) < STATUS_CACHE_TTL) {
    return statusCache.data as T;
  }

  // If a fetch is already in progress, wait for it instead of starting another
  if (statusFetchPromise) {
    return statusFetchPromise as Promise<T | null>;
  }

  // Start a new fetch
  statusFetchPromise = (async () => {
    try {
      const { stdout } = await execGt('gt status --json 2>/dev/null || echo "{}"', {
        timeout: 15000, // 15 second timeout for gt status
      });
      const data = JSON.parse(stdout.trim() || '{}');

      // Update cache
      statusCache = {
        data,
        timestamp: Date.now(),
      };

      return data;
    } catch (error) {
      console.error('Error getting gt status:', error);
      return null;
    } finally {
      // Clear the in-progress promise
      statusFetchPromise = null;
    }
  })();

  return statusFetchPromise as Promise<T | null>;
}

/**
 * Execute bd command and return result
 */
export async function execBd(
  subcommand: string,
  args: string[] = [],
  options: ExecGtOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const cmd = ['bd', subcommand, ...args].join(' ');
  return execGt(cmd, options);
}

/**
 * Clear the cached Gas Town root (call after config changes)
 */
export function resetGtRootCache(): void {
  cachedGtRoot = null;
}

/**
 * Clear the cached gt status result (useful for testing)
 */
export function resetStatusCache(): void {
  statusCache = null;
  statusFetchPromise = null;
}

/**
 * Get the currently resolved Gas Town root path (for display in settings)
 */
export function getResolvedGtRoot(): string {
  return getGtRoot();
}
