/**
 * Data Loading Utilities
 * Functions to load and parse Malagasy language corpus data
 *
 * @example
 * ```ts
 * const dict = await loadDictionary();
 * const ngrams = await loadNgramModel();
 * ```
 */
import type { DictionaryEntry } from '@/services/dictionary';

/** N-gram model type: maps context → weighted predictions */
export type NgramModel = Map<string, Array<{ word: string; frequency: number }>>;

/** Sentiment word lists */
export interface SentimentLexicon {
  positive: Set<string>;
  negative: Set<string>;
}

/**
 * Load dictionary from a JSON file
 * @param url - URL or path to the dictionary JSON
 */
export async function loadDictionary(url?: string): Promise<DictionaryEntry[]> {
  if (!url) return [];

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load dictionary: ${response.statusText}`);
    const data: DictionaryEntry[] = await response.json();
    return data;
  } catch (error) {
    console.warn('Failed to load external dictionary, using built-in:', error);
    return [];
  }
}

/**
 * Load N-gram model from a serialized JSON file
 * Expected format: { "word1 word2": [{ word: "word3", frequency: 10 }, ...] }
 */
export async function loadNgramModel(url?: string): Promise<NgramModel> {
  const model: NgramModel = new Map();

  if (!url) {
    // Return built-in trigram data
    const builtinTrigrams: Record<string, Array<{ word: string; frequency: number }>> = {
      'ny olona': [
        { word: 'rehetra', frequency: 15 },
        { word: 'tsirairay', frequency: 10 },
        { word: 'maro', frequency: 8 },
        { word: 'sasany', frequency: 5 },
      ],
      'manao ahoana': [
        { word: 'ianao', frequency: 20 },
        { word: 'ianareo', frequency: 8 },
        { word: 'izy', frequency: 5 },
      ],
      'ny tany': [
        { word: 'sy', frequency: 12 },
        { word: 'malagasy', frequency: 8 },
        { word: 'rehetra', frequency: 6 },
      ],
      'eto amin': [
        { word: 'ny', frequency: 18 },
        { word: 'ity', frequency: 10 },
      ],
      'ny firenena': [
        { word: 'malagasy', frequency: 14 },
        { word: 'rehetra', frequency: 6 },
        { word: 'maro', frequency: 4 },
      ],
      'ao amin': [
        { word: 'ny', frequency: 20 },
        { word: 'ilay', frequency: 8 },
      ],
      'dia mandeha': [
        { word: 'any', frequency: 10 },
        { word: 'amin', frequency: 8 },
        { word: 'mankany', frequency: 5 },
      ],
      'mba hahafantatra': [
        { word: 'ny', frequency: 12 },
        { word: 'bebe', frequency: 4 },
      ],
      'fitiavana ny': [
        { word: 'tanindrazana', frequency: 10 },
        { word: 'olona', frequency: 8 },
        { word: 'ankizy', frequency: 5 },
      ],
      'misaotra anao': [
        { word: 'betsaka', frequency: 12 },
        { word: 'indrindra', frequency: 6 },
      ],
      'salama tompoko': [
        { word: ',', frequency: 8 },
        { word: '!', frequency: 6 },
      ],
      'veloma tompoko': [
        { word: '!', frequency: 8 },
        { word: ',', frequency: 4 },
      ],
    };

    for (const [key, value] of Object.entries(builtinTrigrams)) {
      model.set(key, value);
    }

    return model;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load N-gram model: ${response.statusText}`);
    const data = await response.json();

    for (const [key, value] of Object.entries(data)) {
      model.set(key, value as Array<{ word: string; frequency: number }>);
    }
  } catch (error) {
    console.warn('Failed to load N-gram model:', error);
  }

  return model;
}

/**
 * Load sentiment lexicon
 */
export function loadSentimentLexicon(): SentimentLexicon {
  return {
    positive: new Set([
      'tsara', 'mahafaly', 'soa', 'faly', 'sambatra', 'hery', 'hajaina',
      'fitiavana', 'fanantenana', 'mahagaga', 'mahafinaritra', 'mahatalanjona',
      'mahasambatra', 'tsaratsara', 'kanto', 'hendry', 'malala', 'mamy',
      'mahavelom-panantenana', 'fiadanana', 'fahasoavana', 'fahombiazana',
      'fandrosoana', 'firahalahiana', 'firaisankina', 'fanajana', 'voninahitra',
    ]),
    negative: new Set([
      'ratsy', 'malahelo', 'loza', 'tezitra', 'alahelo', 'fahoriana', 'maty',
      'marary', 'mahantra', 'mosary', 'maharary', 'mampalahelo', 'mankaleo',
      'maharikoriko', 'mahatsiravina', 'matahotra', 'mampahatahotra',
      'fahavoazana', 'fahasahiranana', 'fahantrana', 'famonoana', 'halatra',
      'kolikoly', 'herisetra', 'fanavakavahana',
    ]),
  };
}

/**
 * Load NER word lists
 */
export function loadNERLists(): {
  cities: Set<string>;
  regions: Set<string>;
  names: Set<string>;
} {
  // These are duplicated from ner.ts but can be extended with external data
  return {
    cities: new Set([
      'antananarivo', 'toamasina', 'mahajanga', 'fianarantsoa', 'toliara',
      'antsirabe', 'antsiranana', 'morondava', 'ambatondrazaka', 'sambava',
    ]),
    regions: new Set([
      'analamanga', 'atsinanana', 'diana', 'sava', 'boeny', 'betsiboka',
      'melaky', 'vakinankaratra', 'haute matsiatra', 'atsimo-andrefana',
    ]),
    names: new Set([
      'rasoa', 'rabe', 'rakoto', 'ravao', 'andry', 'hery', 'nomena',
      'tiana', 'voahangy', 'haingo', 'mialy',
    ]),
  };
}
