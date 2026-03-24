/**
 * Autocomplete Hook for Malagasy text
 * Uses N-gram model to predict next word suggestions
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, accept } = useAutocomplete(text, cursorPos);
 * ```
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadNgramModel, type NgramModel } from '@/utils/dataLoader';

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
  enabled = true
): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition | null>(null);
  const modelRef = useRef<NgramModel | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load N-gram model on mount
  useEffect(() => {
    loadNgramModel().then((model) => {
      modelRef.current = model;
    });
  }, []);

  const predict = useCallback((currentText: string) => {
    if (!modelRef.current || !currentText.trim()) {
      setSuggestions([]);
      setTriggerPosition(null);
      return;
    }

    setIsLoading(true);

    const words = currentText.trim().split(/\s+/);
    const results: string[] = [];

    // Try trigram (last 2 words)
    if (words.length >= 2) {
      const context = `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase();
      const predictions = modelRef.current.get(context);
      if (predictions) {
        results.push(
          ...predictions
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5)
            .map((p) => p.word)
        );
      }
    }

    // Try bigram (last word) if trigram didn't yield enough
    if (results.length < 3 && words.length >= 1) {
      const lastWord = words[words.length - 1].toLowerCase();
      for (const [key, predictions] of modelRef.current.entries()) {
        const keyWords = key.split(' ');
        if (keyWords[keyWords.length - 1] === lastWord) {
          for (const p of predictions) {
            if (!results.includes(p.word)) {
              results.push(p.word);
            }
          }
        }
      }
    }

    setSuggestions(results.slice(0, 5));
    setIsLoading(false);

    // Set trigger position (will be updated by editor integration)
    if (results.length > 0) {
      setTriggerPosition({ x: 0, y: 0 });
    } else {
      setTriggerPosition(null);
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
