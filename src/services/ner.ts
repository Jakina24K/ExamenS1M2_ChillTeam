/**
 * Named Entity Recognition (NER) Service for Malagasy
 * List-based NER with regex patterns for dates and numbers
 *
 * @example
 * ```ts
 * const entities = extractEntities('Nankany Antananarivo i Rasoa');
 * ```
 */

export type EntityType = 'city' | 'region' | 'person' | 'date' | 'number' | 'country';

export interface NamedEntity {
  word: string;
  type: EntityType;
  position: number;
  length: number;
}

/** Malagasy cities */
const CITIES = new Set([
  'antananarivo', 'toamasina', 'mahajanga', 'fianarantsoa', 'toliara',
  'antsirabe', 'ambovombe', 'ambanja', 'antsiranana', 'mananjary',
  'antsirananana', 'morondava', 'ambatondrazaka', 'nosy be', 'sainte-marie',
  'manakara', 'farafangana', 'ambositra', 'ihosy', 'moramanga',
  'miarinarivo', 'tsiroanomandidy', 'maintirano', 'analalava',
  'maroantsetra', 'sambava', 'vohémar', 'andapa', 'ambalavao',
  'betafo', 'ankazobe', 'arivonimamo', 'ambatolampy', 'betioky',
]);

/** Malagasy regions */
const REGIONS = new Set([
  'analamanga', 'atsinanana', 'diana', 'sava', 'boeny', 'betsiboka',
  'melaky', 'alaotra-mangoro', 'analanjirofo', 'vatovavy', 'fitovinany',
  'atsimo-atsinanana', 'ihorombe', 'menabe', 'vakinankaratra',
  'amoron\'i mania', 'haute matsiatra', 'atsimo-andrefana', 'androy',
  'anosy', 'sofia', 'itasy', 'bongolava',
]);

/** Common Malagasy first names */
const PERSON_NAMES = new Set([
  'rasoa', 'rabe', 'rakoto', 'ravao', 'razafy', 'raharinirina',
  'andry', 'hery', 'nomena', 'fidy', 'tiana', 'voahangy',
  'haingo', 'mialy', 'ny aina', 'hasina', 'lalao', 'rija',
  'nirina', 'fara', 'vola', 'zo', 'bodo', 'lova', 'koto',
  'noro', 'tojo', 'soa', 'rina', 'anja', 'mamy', 'lanto',
  'faniry', 'henintsoa', 'fitia', 'mahery', 'toky',
  'rainilaiarivony', 'ranavalona', 'andrianampoinimerina', 'radama',
]);

/** Countries relevant in Malagasy context */
const COUNTRIES = new Set([
  'madagasikara', 'frantsa', 'etazonia', 'shinoa', 'india',
  'japon', 'alemaina', 'angletera', 'italia', 'espaina',
  'afrikatsimo', 'morisy', 'komoro', 'reunion', 'seychelles',
]);

/** Date patterns in Malagasy */
const DATE_PATTERNS = [
  // "12 janoary 2024", "5 febroary", etc.
  /\b(\d{1,2})\s+(janoary|febroary|martsa|aprily|mey|jona|jolay|aogositra|septambra|oktobra|novambra|desambra)\s*(\d{4})?\b/gi,
  // "2024-01-15" ISO format
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  // "15/01/2024" or "15-01-2024"
  /\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b/g,
];

/** Number patterns */
const NUMBER_PATTERNS = [
  /\b\d+([.,]\d+)?\b/g,
  // Malagasy number words
  /\b(iray|roa|telo|efatra|dimy|enina|fito|valo|sivy|folo|zato|arivo)\b/gi,
];

/**
 * Extract named entities from Malagasy text
 * @param text - The text to analyze
 */
export function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];
  const lower = text.toLowerCase();

  // Tokenize for word-based matching
  const wordRegex = /\b[\w'À-ÿ-]+\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(lower)) !== null) {
    const word = match[0];
    const position = match.index;

    if (CITIES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: 'city', position, length: word.length });
    } else if (REGIONS.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: 'region', position, length: word.length });
    } else if (PERSON_NAMES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: 'person', position, length: word.length });
    } else if (COUNTRIES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: 'country', position, length: word.length });
    }
  }

  // Date detection
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        word: match[0],
        type: 'date',
        position: match.index,
        length: match[0].length,
      });
    }
  }

  // Number detection
  for (const pattern of NUMBER_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      // Skip if already matched as part of a date
      const isPartOfDate = entities.some(
        (e) => e.type === 'date' && match!.index >= e.position && match!.index < e.position + e.length
      );
      if (!isPartOfDate) {
        entities.push({
          word: match[0],
          type: 'number',
          position: match.index,
          length: match[0].length,
        });
      }
    }
  }

  // Sort by position
  return entities.sort((a, b) => a.position - b.position);
}

/** Get entity type display label */
export function getEntityLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    city: '🏙️ Tanàna',
    region: '📍 Faritra',
    person: '👤 Olona',
    date: '📅 Daty',
    number: '🔢 Isa',
    country: '🌍 Firenena',
  };
  return labels[type];
}
