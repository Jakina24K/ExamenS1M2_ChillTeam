/**
 * Sentiment Analysis Hook for Malagasy text
 * Bag-of-words classifier using predefined lexicons
 *
 * @example
 * ```tsx
 * const { score, classification, details } = useSentimentAnalysis(text);
 * ```
 */
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/services/api";

export type SentimentClassification = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  /** Score from -1 (very negative) to 1 (very positive) */
  score: number;
  /** Classification label */
  classification: SentimentClassification;
  /** Positive words found */
  positiveWords: string[];
  /** Negative words found */
  negativeWords: string[];
  /** Total analyzed words */
  totalWords: number;
}

export interface UseSentimentAnalysisResult {
  score: number;
  classification: SentimentClassification;
  positiveWords: string[];
  negativeWords: string[];
  isAnalyzing: boolean;
}

/**
 * Hook for real-time sentiment analysis of Malagasy text
 * @param text - Text to analyze
 * @param enabled - Whether analysis is active
 * @param debounceMs - Debounce delay (default: 800)
 */
export function useSentimentAnalysis(
  text: string,
  enabled = true,
  debounceMs = 800,
): UseSentimentAnalysisResult {
  const [result, setResult] = useState<SentimentResult>({
    score: 0,
    classification: "neutral",
    positiveWords: [],
    negativeWords: [],
    totalWords: 0,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text.trim()) {
      setResult({ score: 0, classification: "neutral", positiveWords: [], negativeWords: [], totalWords: 0 });
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setIsAnalyzing(true);
      try {
        const response = await apiClient.sentiment(text);
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResult({
          score: response.score,
          classification: response.classification,
          positiveWords: response.positiveWords,
          negativeWords: response.negativeWords,
          totalWords: text.trim().split(/\s+/).filter(Boolean).length,
        });
      } catch {
        if (requestId === requestIdRef.current) {
          setResult({
            score: 0,
            classification: "neutral",
            positiveWords: [],
            negativeWords: [],
            totalWords: text.trim().split(/\s+/).filter(Boolean).length,
          });
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsAnalyzing(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, enabled, debounceMs]);

  return {
    score: result.score,
    classification: result.classification,
    positiveWords: result.positiveWords,
    negativeWords: result.negativeWords,
    isAnalyzing,
  };
}
