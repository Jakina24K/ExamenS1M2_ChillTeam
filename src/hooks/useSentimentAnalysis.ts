/**
 * Sentiment Analysis Hook for Malagasy text
 * Bag-of-words classifier using predefined lexicons
 *
 * @example
 * ```tsx
 * const { score, classification, details } = useSentimentAnalysis(text);
 * ```
 */
import { useState, useEffect, useRef } from 'react';
import { tokenize, normalize } from '@/utils/textProcessing';
import { loadSentimentLexicon, type SentimentLexicon } from '@/utils/dataLoader';

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
  debounceMs = 800
): UseSentimentAnalysisResult {
  const [result, setResult] = useState<SentimentResult>({
    score: 0,
    classification: 'neutral',
    positiveWords: [],
    negativeWords: [],
    totalWords: 0,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lexiconRef = useRef<SentimentLexicon | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load lexicon once
  useEffect(() => {
    lexiconRef.current = loadSentimentLexicon();
  }, []);

  useEffect(() => {
    if (!enabled || !text.trim()) {
      setResult({ score: 0, classification: 'neutral', positiveWords: [], negativeWords: [], totalWords: 0 });
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsAnalyzing(true);

      const lexicon = lexiconRef.current;
      if (!lexicon) return;

      const words = tokenize(text).map(normalize);
      const positiveWords: string[] = [];
      const negativeWords: string[] = [];

      for (const word of words) {
        if (lexicon.positive.has(word)) positiveWords.push(word);
        else if (lexicon.negative.has(word)) negativeWords.push(word);
      }

      const totalSentimentWords = positiveWords.length + negativeWords.length;
      let score = 0;

      if (totalSentimentWords > 0) {
        score = (positiveWords.length - negativeWords.length) / totalSentimentWords;
      }

      let classification: SentimentClassification = 'neutral';
      if (score > 0.15) classification = 'positive';
      else if (score < -0.15) classification = 'negative';

      setResult({
        score,
        classification,
        positiveWords: [...new Set(positiveWords)],
        negativeWords: [...new Set(negativeWords)],
        totalWords: words.length,
      });
      setIsAnalyzing(false);
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

/**
 * Standalone sentiment analysis function (non-hook)
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lexicon = loadSentimentLexicon();
  const words = tokenize(text).map(normalize);
  const positiveWords: string[] = [];
  const negativeWords: string[] = [];

  for (const word of words) {
    if (lexicon.positive.has(word)) positiveWords.push(word);
    else if (lexicon.negative.has(word)) negativeWords.push(word);
  }

  const totalSentimentWords = positiveWords.length + negativeWords.length;
  let score = 0;
  if (totalSentimentWords > 0) {
    score = (positiveWords.length - negativeWords.length) / totalSentimentWords;
  }

  let classification: SentimentClassification = 'neutral';
  if (score > 0.15) classification = 'positive';
  else if (score < -0.15) classification = 'negative';

  return {
    score,
    classification,
    positiveWords: [...new Set(positiveWords)],
    negativeWords: [...new Set(negativeWords)],
    totalWords: words.length,
  };
}
