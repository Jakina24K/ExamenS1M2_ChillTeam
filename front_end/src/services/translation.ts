/**
 * Malagasy Translation Service
 * Word-level translation between Malagasy, French, and English
 * Uses local dictionary with optional LibreTranslate API fallback
 *
 * @example
 * ```ts
 * const result = await translateWord('trano', 'en');
 * // { translation: 'house', source: 'dictionary' }
 * ```
 */

export interface TranslationResult {
  translation: string;
  source: 'api' | 'dictionary';
  confidence?: number;
}

/** Built-in translation dictionary (Malagasy → French/English) */
const TRANSLATIONS: Record<string, { fr: string; en: string }> = {
  trano: { fr: 'maison', en: 'house' },
  olona: { fr: 'personne', en: 'person' },
  lehilahy: { fr: 'homme', en: 'man' },
  vehivavy: { fr: 'femme', en: 'woman' },
  ankizy: { fr: 'enfant', en: 'child' },
  rano: { fr: 'eau', en: 'water' },
  hazo: { fr: 'arbre', en: 'tree' },
  vary: { fr: 'riz', en: 'rice' },
  afo: { fr: 'feu', en: 'fire' },
  lanitra: { fr: 'ciel', en: 'sky' },
  tany: { fr: 'terre', en: 'earth' },
  andro: { fr: 'jour', en: 'day' },
  alina: { fr: 'nuit', en: 'night' },
  tsara: { fr: 'bon', en: 'good' },
  ratsy: { fr: 'mauvais', en: 'bad' },
  lehibe: { fr: 'grand', en: 'big' },
  kely: { fr: 'petit', en: 'small' },
  fitiavana: { fr: 'amour', en: 'love' },
  fanantenana: { fr: 'espoir', en: 'hope' },
  fahendrena: { fr: 'sagesse', en: 'wisdom' },
  lalana: { fr: 'chemin', en: 'road' },
  vola: { fr: 'argent', en: 'money' },
  asa: { fr: 'travail', en: 'work' },
  fianakaviana: { fr: 'famille', en: 'family' },
  ray: { fr: 'père', en: 'father' },
  reny: { fr: 'mère', en: 'mother' },
  namana: { fr: 'ami', en: 'friend' },
  boky: { fr: 'livre', en: 'book' },
  teny: { fr: 'mot', en: 'word' },
  fiteny: { fr: 'langue', en: 'language' },
  fotoana: { fr: 'temps', en: 'time' },
  sakafo: { fr: 'nourriture', en: 'food' },
  sekoly: { fr: 'école', en: 'school' },
  ny: { fr: 'le/la', en: 'the' },
  sy: { fr: 'et', en: 'and' },
  fa: { fr: 'mais', en: 'but' },
  dia: { fr: 'alors', en: 'then' },
  tsy: { fr: 'ne...pas', en: 'not' },
  izaho: { fr: 'je', en: 'I' },
  ianao: { fr: 'tu', en: 'you' },
  izy: { fr: 'il/elle', en: 'he/she' },
  isika: { fr: 'nous', en: 'we' },
  mandeha: { fr: 'aller', en: 'to go' },
  miasa: { fr: 'travailler', en: 'to work' },
  mianatra: { fr: 'étudier', en: 'to study' },
  manao: { fr: 'faire', en: 'to do' },
  mahita: { fr: 'voir', en: 'to see' },
  mihinana: { fr: 'manger', en: 'to eat' },
  misotro: { fr: 'boire', en: 'to drink' },
  matory: { fr: 'dormir', en: 'to sleep' },
  milaza: { fr: 'dire', en: 'to say' },
  manoratra: { fr: 'écrire', en: 'to write' },
  mamaky: { fr: 'lire', en: 'to read' },
  mahalala: { fr: 'savoir', en: 'to know' },
  Madagasikara: { fr: 'Madagascar', en: 'Madagascar' },
  malagasy: { fr: 'malgache', en: 'Malagasy' },
  omby: { fr: 'boeuf', en: 'cattle' },
  vorona: { fr: 'oiseau', en: 'bird' },
  varika: { fr: 'lémurien', en: 'lemur' },
  alika: { fr: 'chien', en: 'dog' },
  saka: { fr: 'chat', en: 'cat' },
};

/** Reverse translation maps */
const FR_TO_MG: Record<string, string> = {};
const EN_TO_MG: Record<string, string> = {};

// Build reverse maps
for (const [mg, trans] of Object.entries(TRANSLATIONS)) {
  FR_TO_MG[trans.fr.toLowerCase()] = mg;
  EN_TO_MG[trans.en.toLowerCase()] = mg;
}

/**
 * Translate a single word
 * @param word - Word to translate
 * @param targetLang - Target language ('fr' | 'en' | 'mg')
 * @param sourceLang - Source language (auto-detected if not provided)
 */
export async function translateWord(
  word: string,
  targetLang: 'fr' | 'en' | 'mg' = 'fr',
  sourceLang?: 'mg' | 'fr' | 'en'
): Promise<TranslationResult> {
  const lower = word.toLowerCase();

  // Dictionary lookup
  if (sourceLang === 'mg' || !sourceLang) {
    const entry = TRANSLATIONS[lower];
    if (entry && targetLang !== 'mg') {
      return {
        translation: entry[targetLang as 'fr' | 'en'],
        source: 'dictionary',
        confidence: 1.0,
      };
    }
  }

  if (targetLang === 'mg') {
    if (sourceLang === 'fr' || !sourceLang) {
      const mg = FR_TO_MG[lower];
      if (mg) return { translation: mg, source: 'dictionary', confidence: 1.0 };
    }
    if (sourceLang === 'en' || !sourceLang) {
      const mg = EN_TO_MG[lower];
      if (mg) return { translation: mg, source: 'dictionary', confidence: 1.0 };
    }
  }

  // API fallback (LibreTranslate)
  try {
    const langMap = { mg: 'mg', fr: 'fr', en: 'en' };
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: word,
        source: langMap[sourceLang || 'mg'],
        target: langMap[targetLang],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        translation: data.translatedText,
        source: 'api',
        confidence: 0.7,
      };
    }
  } catch {
    // API unavailable, return original word
  }

  return { translation: word, source: 'dictionary', confidence: 0 };
}

/**
 * Batch translate multiple words
 * @param words - Array of words to translate
 * @param targetLang - Target language
 */
export async function batchTranslate(
  words: string[],
  targetLang: 'fr' | 'en' | 'mg' = 'fr'
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();
  const promises = words.map(async (word) => {
    const result = await translateWord(word, targetLang);
    results.set(word, result);
  });
  await Promise.all(promises);
  return results;
}

/**
 * Get inline translation hint for a word (for tooltip display)
 */
export function getTranslationHint(word: string): string | null {
  const lower = word.toLowerCase();
  const entry = TRANSLATIONS[lower];
  if (entry) return `🇫🇷 ${entry.fr} | 🇬🇧 ${entry.en}`;
  return null;
}
