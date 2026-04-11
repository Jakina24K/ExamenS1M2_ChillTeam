/**
 * Spell Check Hook for Malagasy text
 * Compares words against dictionary using Levenshtein distance for suggestions
 *
 * @example
 * ```tsx
 * const { misspelledWords, isChecking } = useSpellCheck(editorText);
 * ```
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/services/api";

export interface MisspelledWord {
  word: string;
  position: number;
  suggestions: string[];
}

export interface UseSpellCheckResult {
  misspelledWords: MisspelledWord[];
  isChecking: boolean;
  recheckNow: () => void;
}

/**
 * Hook for real-time spell checking of Malagasy text
 * @param text - Current text content to check
 * @param enabled - Whether spell checking is active
 * @param debounceMs - Debounce delay in milliseconds (default: 500)
 */
export function useSpellCheck(
  text: string,
  enabled = true,
  debounceMs = 500,
): UseSpellCheckResult {
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const checkSpelling = useCallback(async (content: string) => {
    if (!content.trim()) {
      setMisspelledWords([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsChecking(true);
    try {
      const results = await apiClient.spellcheck(content);
      if (requestId === requestIdRef.current) {
        setMisspelledWords(results);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setMisspelledWords([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setMisspelledWords([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => checkSpelling(text), debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, enabled, debounceMs, checkSpelling]);

  const recheckNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    checkSpelling(text);
  }, [text, checkSpelling]);

  return { misspelledWords, isChecking, recheckNow };
}
