/**
 * Malagasy Lemmatization Service
 * Rule-based lemmatizer that strips common affixes to find root words (fototeny)
 *
 * @example
 * ```ts
 * const root = lemmatize('mpampianatra'); // 'anatra'
 * ```
 */
import { MalagasyDictionary } from './dictionary';

/** Common Malagasy prefixes in order of length (longest first for greedy matching) */
const PREFIXES = [
  'mpampan', 'mpampa', 'mpamp', 'mpan', 'mpam',
  'maha', 'man', 'mam', 'map', 'mat',
  'mi', 'ma', 'mp',
  'fan', 'fam', 'fi', 'fa',
  'an', 'am',
  'i',
] as const;

/** Common Malagasy suffixes in order of length (longest first) */
const SUFFIXES = [
  '-ana', '-ina', '-na',
  'ana', 'ina', 'na',
] as const;

export interface LemmatizationResult {
  /** Original input word */
  original: string;
  /** Extracted root word (fototeny) */
  root: string;
  /** Prefix that was stripped, if any */
  prefix: string | null;
  /** Suffix that was stripped, if any */
  suffix: string | null;
  /** Whether the root was validated against the dictionary */
  dictionaryValidated: boolean;
}

/**
 * Lemmatize a Malagasy word by stripping common affixes
 * @param word - The word to lemmatize
 * @param useDictionary - Whether to validate against dictionary (default: true)
 */
export function lemmatize(word: string, useDictionary = true): LemmatizationResult {
  const lower = word.toLowerCase().trim();

  // Try dictionary lookup first
  if (useDictionary) {
    const dict = MalagasyDictionary.getInstance();
    if (dict.isLoaded) {
      const entry = dict.getEntry(lower);
      if (entry?.root) {
        return {
          original: word,
          root: entry.root,
          prefix: null,
          suffix: null,
          dictionaryValidated: true,
        };
      }
    }
  }

  let bestResult: LemmatizationResult = {
    original: word,
    root: lower,
    prefix: null,
    suffix: null,
    dictionaryValidated: false,
  };

  // Try stripping prefixes and suffixes
  for (const prefix of PREFIXES) {
    if (!lower.startsWith(prefix)) continue;

    const afterPrefix = lower.slice(prefix.length);
    if (afterPrefix.length < 2) continue;

    for (const suffix of SUFFIXES) {
      const cleanSuffix = suffix.replace('-', '');
      if (!afterPrefix.endsWith(cleanSuffix)) continue;

      const root = afterPrefix.slice(0, afterPrefix.length - cleanSuffix.length);
      if (root.length < 2) continue;

      // Validate against dictionary if available
      if (useDictionary) {
        const dict = MalagasyDictionary.getInstance();
        if (dict.isLoaded && dict.exists(root)) {
          return {
            original: word,
            root,
            prefix,
            suffix: cleanSuffix,
            dictionaryValidated: true,
          };
        }
      }

      // Keep longest prefix match as best
      if (!bestResult.prefix || prefix.length > bestResult.prefix.length) {
        bestResult = {
          original: word,
          root,
          prefix,
          suffix: cleanSuffix,
          dictionaryValidated: false,
        };
      }
    }

    // Try prefix only
    if (afterPrefix.length >= 2) {
      if (useDictionary) {
        const dict = MalagasyDictionary.getInstance();
        if (dict.isLoaded && dict.exists(afterPrefix)) {
          return {
            original: word,
            root: afterPrefix,
            prefix,
            suffix: null,
            dictionaryValidated: true,
          };
        }
      }

      if (!bestResult.prefix || prefix.length > bestResult.prefix.length) {
        bestResult = {
          original: word,
          root: afterPrefix,
          prefix,
          suffix: null,
          dictionaryValidated: false,
        };
      }
    }
  }

  // Try suffix only
  for (const suffix of SUFFIXES) {
    const cleanSuffix = suffix.replace('-', '');
    if (!lower.endsWith(cleanSuffix)) continue;

    const root = lower.slice(0, lower.length - cleanSuffix.length);
    if (root.length < 2) continue;

    if (useDictionary) {
      const dict = MalagasyDictionary.getInstance();
      if (dict.isLoaded && dict.exists(root)) {
        return {
          original: word,
          root,
          prefix: null,
          suffix: cleanSuffix,
          dictionaryValidated: true,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Batch lemmatize multiple words
 * @param words - Array of words to lemmatize
 */
export function batchLemmatize(words: string[]): LemmatizationResult[] {
  return words.map((w) => lemmatize(w));
}
