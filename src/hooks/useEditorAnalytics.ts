/**
 * Editor Analytics Hook
 * Tracks user interactions and persists to localStorage
 *
 * @example
 * ```tsx
 * const { stats, increment, reset } = useEditorAnalytics();
 * increment('spellcheckUsed');
 * ```
 */
import { useState, useEffect, useCallback } from 'react';

export interface EditorStats {
  wordCount: number;
  sessionsCount: number;
  correctionsAccepted: number;
  autocompleteAccepted: number;
  spellcheckRuns: number;
  translationsRequested: number;
  sentimentAnalysisRuns: number;
  nerRuns: number;
  totalEditingTimeSeconds: number;
  lastSessionStart: number;
  [key: string]: number;
}

const STORAGE_KEY = 'malagasy-editor-analytics';

const defaultStats: EditorStats = {
  wordCount: 0,
  sessionsCount: 0,
  correctionsAccepted: 0,
  autocompleteAccepted: 0,
  spellcheckRuns: 0,
  translationsRequested: 0,
  sentimentAnalysisRuns: 0,
  nerRuns: 0,
  totalEditingTimeSeconds: 0,
  lastSessionStart: 0,
};

function loadStats(): EditorStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultStats, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...defaultStats };
}

function saveStats(stats: EditorStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage may be full
  }
}

export interface UseEditorAnalyticsResult {
  stats: EditorStats;
  increment: (key: string, amount?: number) => void;
  set: (key: string, value: number) => void;
  reset: () => void;
}

/**
 * Hook for tracking editor usage analytics
 * Persists to localStorage automatically
 */
export function useEditorAnalytics(): UseEditorAnalyticsResult {
  const [stats, setStats] = useState<EditorStats>(loadStats);

  // Track session start and editing time
  useEffect(() => {
    const sessionStart = Date.now();

    setStats((prev) => {
      const updated = {
        ...prev,
        sessionsCount: prev.sessionsCount + 1,
        lastSessionStart: sessionStart,
      };
      saveStats(updated);
      return updated;
    });

    // Update editing time on unmount
    return () => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      setStats((prev) => {
        const updated = {
          ...prev,
          totalEditingTimeSeconds: prev.totalEditingTimeSeconds + elapsed,
        };
        saveStats(updated);
        return updated;
      });
    };
  }, []);

  const increment = useCallback((key: string, amount = 1) => {
    setStats((prev) => {
      const updated = { ...prev, [key]: (prev[key] || 0) + amount };
      saveStats(updated);
      return updated;
    });
  }, []);

  const set = useCallback((key: string, value: number) => {
    setStats((prev) => {
      const updated = { ...prev, [key]: value };
      saveStats(updated);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = { ...defaultStats };
    saveStats(fresh);
    setStats(fresh);
  }, []);

  return { stats, increment, set, reset };
}
