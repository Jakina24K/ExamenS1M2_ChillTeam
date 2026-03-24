/**
 * Text Processing Utilities for Malagasy
 * Tokenization, normalization, syllable counting, and reading time estimation
 *
 * @example
 * ```ts
 * const words = tokenize("Manao ahoana ianao?");
 * const time = estimateReadingTime("...", 180);
 * ```
 */

/**
 * Tokenize Malagasy text into words
 * Handles apostrophes, hyphenated words, and Malagasy-specific patterns
 */
export function tokenize(text: string): string[] {
  if (!text.trim()) return [];
  // Match words including apostrophes and hyphens within words
  const matches = text.match(/[\w'À-ÿ][\w'À-ÿ-]*/g);
  return matches || [];
}

/**
 * Normalize text for comparison
 * Lowercases and removes diacritics
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Count syllables in a Malagasy word
 * Malagasy syllable structure is primarily (C)V(C)
 * Vowels: a, e, i, o
 * Note: 'y' at end of word is typically silent or semi-vowel
 */
export function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  // Count vowel groups (a, e, i, o are main vowels in Malagasy)
  const vowelGroups = lower.match(/[aeio]+/g);
  if (!vowelGroups) return 1;

  let count = vowelGroups.length;

  // Handle diphthongs: 'ai', 'ao', 'oi' are typically one syllable
  const diphthongs = lower.match(/(ai|ao|oi|ia|io|oa)/g);
  if (diphthongs) {
    count -= Math.floor(diphthongs.length / 2);
  }

  return Math.max(1, count);
}

/**
 * Estimate reading time for Malagasy text
 * @param text - The text to estimate
 * @param wordsPerMinute - Reading speed (default: 180 for Malagasy)
 * @returns Reading time in seconds
 */
export function estimateReadingTime(text: string, wordsPerMinute = 180): number {
  const words = tokenize(text);
  return Math.ceil((words.length / wordsPerMinute) * 60);
}

/**
 * Format reading time as human-readable string
 */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} segondra`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} minitra`;
  return `${minutes} min ${remainingSeconds}s`;
}

/**
 * Count words in text
 */
export function wordCount(text: string): number {
  return tokenize(text).length;
}

/**
 * Count characters (excluding spaces)
 */
export function charCount(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Count sentences (rough estimation)
 */
export function sentenceCount(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

/**
 * Get text statistics
 */
export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: string;
  syllables: number;
}

export function getTextStats(text: string): TextStats {
  const words = tokenize(text);
  const readingSeconds = estimateReadingTime(text);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  return {
    words: words.length,
    characters: text.length,
    charactersNoSpaces: charCount(text),
    sentences: sentenceCount(text),
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length || (text.trim() ? 1 : 0),
    readingTime: formatReadingTime(readingSeconds),
    syllables: totalSyllables,
  };
}
