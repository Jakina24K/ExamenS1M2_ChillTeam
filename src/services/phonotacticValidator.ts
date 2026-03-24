/**
 * Phonotactic Validator for Malagasy
 * Validates words against Malagasy phonotactic constraints
 *
 * @example
 * ```ts
 * const result = validatePhonotactics('nbola');
 * // { isValid: false, errors: [{ pattern: 'nb', position: 0, suggestion: 'mb' }] }
 * ```
 */

export interface PhonotacticError {
  pattern: string;
  position: number;
  suggestion: string;
  rule: string;
}

export interface PhonotacticResult {
  isValid: boolean;
  errors: PhonotacticError[];
}

/** Forbidden consonant clusters with their corrections */
const FORBIDDEN_PATTERNS: Array<{
  pattern: RegExp;
  forbidden: string;
  suggestion: string;
  rule: string;
}> = [
  { pattern: /nb/gi, forbidden: 'nb', suggestion: 'mb', rule: 'Tsy azo atao ny "nb" — ampiasao "mb"' },
  { pattern: /^nk/gi, forbidden: 'nk', suggestion: 'nk→ng', rule: 'Tsy azo atao ny "nk" eo am-piandohan-teny' },
  { pattern: /^mk/gi, forbidden: 'mk', suggestion: 'mk→ng', rule: 'Tsy azo atao ny "mk" eo am-piandohan-teny' },
  { pattern: /dt/gi, forbidden: 'dt', suggestion: 'nt', rule: 'Tsy azo atao ny "dt" — ampiasao "nt"' },
  { pattern: /bp/gi, forbidden: 'bp', suggestion: 'mp', rule: 'Tsy azo atao ny "bp" — ampiasao "mp"' },
  { pattern: /sz/gi, forbidden: 'sz', suggestion: 'z', rule: 'Tsy azo atao ny "sz" — ampiasao "z"' },
  { pattern: /^ng(?!a|e|i|o)/gi, forbidden: 'ng+', suggestion: 'n', rule: 'Ny "ng" tsy manaraka zanatsoratra' },
  { pattern: /[bcdfghjklpqrstvwxyz]{4,}/gi, forbidden: 'cluster', suggestion: '(simplify)', rule: 'Be loatra ny renisoratra mifanesy' },
];

/** Additional word-initial constraints */
const INITIAL_FORBIDDEN = [
  { pattern: /^dl/i, suggestion: 'l', rule: 'Tsy azo atao ny "dl" eo am-piandohan-teny' },
  { pattern: /^tl/i, suggestion: 'l', rule: 'Tsy azo atao ny "tl" eo am-piandohan-teny' },
  { pattern: /^sr/i, suggestion: 'r', rule: 'Tsy azo atao ny "sr" eo am-piandohan-teny' },
];

/**
 * Validate a word against Malagasy phonotactic rules
 * @param word - The word to validate
 */
export function validatePhonotactics(word: string): PhonotacticResult {
  const errors: PhonotacticError[] = [];
  const lower = word.toLowerCase();

  for (const rule of FORBIDDEN_PATTERNS) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(lower)) !== null) {
      errors.push({
        pattern: match[0],
        position: match.index,
        suggestion: rule.suggestion,
        rule: rule.rule,
      });
    }
  }

  for (const rule of INITIAL_FORBIDDEN) {
    if (rule.pattern.test(lower)) {
      errors.push({
        pattern: lower.slice(0, 2),
        position: 0,
        suggestion: rule.suggestion,
        rule: rule.rule,
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate entire text, checking each word
 * @param text - The text to validate
 */
export function validateText(text: string): Array<{ word: string; position: number; result: PhonotacticResult }> {
  const results: Array<{ word: string; position: number; result: PhonotacticResult }> = [];
  const wordRegex = /\b[\w'À-ÿ]+\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const result = validatePhonotactics(match[0]);
    if (!result.isValid) {
      results.push({ word: match[0], position: match.index, result });
    }
  }

  return results;
}
