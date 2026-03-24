/**
 * FastAPI Backend Client
 * Typed API client for the Malagasy AI Text Editor backend
 *
 * @example
 * ```ts
 * const result = await apiClient.spellcheck({ text: 'Salama tompoko' });
 * ```
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** Common request/response types */
export interface SpellcheckRequest {
  text: string;
  language?: string;
}

export interface SpellcheckResponse {
  misspelledWords: Array<{
    word: string;
    position: number;
    suggestions: string[];
  }>;
}

export interface AutocompleteRequest {
  text: string;
  cursorPosition: number;
  maxSuggestions?: number;
}

export interface AutocompleteResponse {
  suggestions: string[];
  context: string;
}

export interface LemmatizeRequest {
  word: string;
}

export interface LemmatizeResponse {
  original: string;
  root: string;
  prefix: string | null;
  suffix: string | null;
}

export interface TranslateRequest {
  word: string;
  targetLang: 'fr' | 'en' | 'mg';
  sourceLang?: 'mg' | 'fr' | 'en';
}

export interface TranslateResponse {
  translation: string;
  source: 'api' | 'dictionary';
  confidence: number;
}

export interface SentimentRequest {
  text: string;
}

export interface SentimentResponse {
  score: number;
  classification: 'positive' | 'negative' | 'neutral';
  positiveWords: string[];
  negativeWords: string[];
}

export interface NERRequest {
  text: string;
}

export interface NERResponse {
  entities: Array<{
    word: string;
    type: string;
    position: number;
    length: number;
  }>;
}

export interface ValidateRequest {
  text: string;
}

export interface ValidateResponse {
  isValid: boolean;
  errors: Array<{
    word: string;
    position: number;
    pattern: string;
    suggestion: string;
  }>;
}

/** API error class */
export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'APIError';
  }
}

/** Retry configuration */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic fetch wrapper with retry logic and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new APIError(response.status, response.statusText, body);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      if (error instanceof APIError && error.status < 500) throw error;
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw new Error('Unexpected: exhausted retries');
}

/** API client with typed endpoints */
export const apiClient = {
  /** Check spelling of text */
  spellcheck: (data: SpellcheckRequest) =>
    apiFetch<SpellcheckResponse>('/spellcheck', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get autocomplete suggestions */
  autocomplete: (data: AutocompleteRequest) =>
    apiFetch<AutocompleteResponse>('/autocomplete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get word root (lemmatization) */
  lemmatize: (data: LemmatizeRequest) =>
    apiFetch<LemmatizeResponse>('/lemmatize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Translate a word */
  translate: (data: TranslateRequest) =>
    apiFetch<TranslateResponse>('/translate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Analyze sentiment */
  sentiment: (data: SentimentRequest) =>
    apiFetch<SentimentResponse>('/sentiment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Extract named entities */
  ner: (data: NERRequest) =>
    apiFetch<NERResponse>('/ner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Validate phonotactic rules */
  validate: (data: ValidateRequest) =>
    apiFetch<ValidateResponse>('/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
