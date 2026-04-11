const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export interface MisspelledWord {
  word: string;
  position: number;
  suggestions: string[];
}

export interface RootWordResponse {
  fototeny: string;
  tovona: string;
  tovana: string;
  sampanteny: string;
}

export type BackendEntityType = "City" | "Province" | "Name" | "Region";

export interface BackendEntity {
  word: string;
  type: BackendEntityType;
}

export interface SentimentResponse {
  score: number;
  classification: "positive" | "negative" | "neutral";
  positiveWords: string[];
  negativeWords: string[];
}

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "APIError";
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new APIError(response.status, response.statusText, body);
  }

  return response.json() as Promise<T>;
}

function findWordPosition(text: string, word: string, startIndex: number): number {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
  regex.lastIndex = startIndex;
  const match = regex.exec(text);
  return match ? match.index : text.indexOf(word, startIndex);
}

function normalizeSuggestions(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.filter((value): value is string => typeof value === "string");
  }

  if (typeof result === "string" && result !== "Le mot est correct") {
    return [result];
  }

  return [];
}

function normalizeSentimentLabel(label: string): SentimentResponse["classification"] {
  switch (label) {
    case "POSITIVE":
      return "positive";
    case "NEGATIVE":
      return "negative";
    default:
      return "neutral";
  }
}

export const apiClient = {
  detectRootWord: (word: string) =>
    apiFetch<RootWordResponse>("/detect_root_word/", {
      method: "POST",
      body: JSON.stringify({ word }),
    }),

  autocomplete: async (sentence: string) => {
    const suggestions = await apiFetch<string[]>("/autocompletion/", {
      method: "POST",
      body: JSON.stringify({ sentence }),
    });

    return Array.isArray(suggestions) ? suggestions : [];
  },

  correction: (word: string) =>
    apiFetch<string[] | string>("/correction/", {
      method: "POST",
      body: JSON.stringify({ word }),
    }),

  spellcheck: async (sentence: string): Promise<MisspelledWord[]> => {
    const results = await apiFetch<
      Array<{ word: string; valid: boolean; error: string | null }>
    >("/check_words/", {
      method: "POST",
      body: JSON.stringify({ sentence }),
    });

    const invalidWords = results.filter((entry) => !entry.valid);
    let searchStart = 0;

    return Promise.all(
      invalidWords.map(async (entry) => {
        const position = findWordPosition(sentence, entry.word, searchStart);
        searchStart = position >= 0 ? position + entry.word.length : searchStart;

        let suggestions: string[] = [];
        try {
          suggestions = normalizeSuggestions(await apiClient.correction(entry.word));
        } catch {
          suggestions = [];
        }

        return {
          word: entry.word,
          position: Math.max(position, 0),
          suggestions: suggestions.filter((suggestion) => suggestion.toLowerCase() !== entry.word.toLowerCase()),
        };
      }),
    );
  },

  ner: async (sentence: string): Promise<BackendEntity[]> => {
    const response = await apiFetch<{ entities: BackendEntity[]; count: number }>(
      "/named_entity_recognition/",
      {
        method: "POST",
        body: JSON.stringify({ sentence }),
      },
    );

    return response.entities || [];
  },

  sentiment: async (sentence: string): Promise<SentimentResponse> => {
    const response = await apiFetch<string>("/sentence_sentiment/", {
      method: "POST",
      body: JSON.stringify({ sentence }),
    });

    return {
      score: response === "POSITIVE" ? 1 : response === "NEGATIVE" ? -1 : 0,
      classification: normalizeSentimentLabel(response),
      positiveWords: [],
      negativeWords: [],
    };
  },
};
