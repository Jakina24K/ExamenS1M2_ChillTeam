/**
 * Autocomplete Hook for Malagasy text
 * Uses N-gram model to predict next word suggestions
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, accept } = useAutocomplete(text, cursorPos);
 * ```
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/services/api";

export interface AutocompleteSuggestion {
  word: string;
  score: number;
}

export interface TriggerPosition {
  x: number;
  y: number;
}

export interface UseAutocompleteResult {
  suggestions: string[];
  isLoading: boolean;
  triggerPosition: TriggerPosition | null;
  accept: (word: string) => string;
  dismiss: () => void;
}

/**
 * Hook for N-gram based autocomplete in Malagasy
 * @param text - Current text content
 * @param enabled - Whether autocomplete is active
 */
export function useAutocomplete(
  text: string,
  enabled = true,
): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const predict = useCallback(async (currentText: string) => {
    if (!currentText.trim()) {
      setSuggestions([]);
      setTriggerPosition(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const results = await apiClient.autocomplete(currentText);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuggestions(results.slice(0, 5));
      setTriggerPosition(results.length > 0 ? { x: 0, y: 0 } : null);
    } catch {
      if (requestId === requestIdRef.current) {
        setSuggestions([]);
        setTriggerPosition(null);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setTriggerPosition(null);
      return;
    }

    // Only trigger after space + some text
    if (!text.endsWith(' ') && text.length > 2) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => predict(text), 300);
    } else {
      setSuggestions([]);
      setTriggerPosition(null);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, enabled, predict]);

  /** Accept a suggestion and return updated text */
  const accept = useCallback(
    (word: string): string => {
      setSuggestions([]);
      setTriggerPosition(null);
      const trimmed = text.trimEnd();
      return `${trimmed} ${word} `;
    },
    [text]
  );

  const dismiss = useCallback(() => {
    setSuggestions([]);
    setTriggerPosition(null);
  }, []);

  return { suggestions, isLoading, triggerPosition, accept, dismiss };
}
