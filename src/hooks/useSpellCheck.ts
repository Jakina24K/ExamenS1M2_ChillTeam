/**
 * Spell Check Hook for Malagasy text
 * Compares words against dictionary using Levenshtein distance for suggestions
 *
 * @example
 * ```tsx
 * const { misspelledWords, isChecking } = useSpellCheck(editorText);
 * ```
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import levenshtein from 'fast-levenshtein';
import { MalagasyDictionary } from '@/services/dictionary';
import { tokenize } from '@/utils/textProcessing';

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
  debounceMs = 500
): UseSpellCheckResult {
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dictRef = useRef<MalagasyDictionary>(MalagasyDictionary.getInstance());

  const checkSpelling = useCallback((content: string) => {
    if (!content.trim()) {
      setMisspelledWords([]);
      return;
    }

    setIsChecking(true);
    const dict = dictRef.current;

    // Ensure dictionary is loaded
    if (!dict.isLoaded) {
      dict.load().then(() => checkSpelling(content));
      return;
    }

    const words = tokenize(content);
    const misspelled: MisspelledWord[] = [];

    let searchStart = 0;
    for (const word of words) {
      // Skip very short words, numbers, punctuation
      if (word.length <= 1 || /^\d+$/.test(word)) continue;

      const position = content.indexOf(word, searchStart);
      searchStart = position + word.length;

      // Skip if word exists in dictionary
      if (dict.exists(word)) continue;

      // Skip capitalized words (likely proper nouns)
      if (word[0] === word[0].toUpperCase() && word.length > 2) continue;

      // Generate suggestions using Levenshtein distance
      const allWords = dict.getAllWords();
      const scored: Array<{ w: string; d: number }> = [];

      for (const candidate of allWords) {
        if (Math.abs(candidate.length - word.length) > 2) continue;
        const dist = levenshtein.get(word.toLowerCase(), candidate);
        if (dist <= 3 && dist > 0) {
          scored.push({ w: candidate, d: dist });
        }
      }

      const suggestions = scored
        .sort((a, b) => a.d - b.d)
        .slice(0, 5)
        .map((s) => s.w);

      misspelled.push({ word, position, suggestions });
    }

    setMisspelledWords(misspelled);
    setIsChecking(false);
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
