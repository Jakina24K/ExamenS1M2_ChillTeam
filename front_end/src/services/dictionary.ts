/**
 * Malagasy Dictionary Service
 * Provides word lookup, existence check, and fuzzy search capabilities
 *
 * @example
 * ```ts
 * const dict = MalagasyDictionary.getInstance();
 * await dict.load();
 * const result = dict.lookup('mandeha');
 * ```
 */
import levenshtein from 'fast-levenshtein';

export interface DictionaryEntry {
  word: string;
  definition?: string;
  partOfSpeech?: string;
  root?: string;
}

export interface LookupResult {
  exists: boolean;
  suggestions: string[];
  definition?: string;
}

/** Common Malagasy words for the built-in dictionary */
const BUILTIN_WORDS: DictionaryEntry[] = [
  { word: 'mandeha', definition: 'aller / to go', partOfSpeech: 'verbe', root: 'andeha' },
  { word: 'miasa', definition: 'travailler / to work', partOfSpeech: 'verbe', root: 'asa' },
  { word: 'mianatra', definition: 'étudier / to study', partOfSpeech: 'verbe', root: 'anatra' },
  { word: 'trano', definition: 'maison / house', partOfSpeech: 'nom' },
  { word: 'olona', definition: 'personne / person', partOfSpeech: 'nom' },
  { word: 'lehilahy', definition: 'homme / man', partOfSpeech: 'nom' },
  { word: 'vehivavy', definition: 'femme / woman', partOfSpeech: 'nom' },
  { word: 'ankizy', definition: 'enfant / child', partOfSpeech: 'nom' },
  { word: 'firenena', definition: 'nation / nation', partOfSpeech: 'nom' },
  { word: 'tanana', definition: 'ville, main / city, hand', partOfSpeech: 'nom' },
  { word: 'rano', definition: 'eau / water', partOfSpeech: 'nom' },
  { word: 'hazo', definition: 'arbre / tree', partOfSpeech: 'nom' },
  { word: 'vary', definition: 'riz / rice', partOfSpeech: 'nom' },
  { word: 'afo', definition: 'feu / fire', partOfSpeech: 'nom' },
  { word: 'lanitra', definition: 'ciel / sky', partOfSpeech: 'nom' },
  { word: 'tany', definition: 'terre / earth', partOfSpeech: 'nom' },
  { word: 'andro', definition: 'jour / day', partOfSpeech: 'nom' },
  { word: 'alina', definition: 'nuit / night', partOfSpeech: 'nom' },
  { word: 'tsara', definition: 'bon, beau / good, beautiful', partOfSpeech: 'adj' },
  { word: 'ratsy', definition: 'mauvais / bad', partOfSpeech: 'adj' },
  { word: 'lehibe', definition: 'grand / big', partOfSpeech: 'adj' },
  { word: 'kely', definition: 'petit / small', partOfSpeech: 'adj' },
  { word: 'mena', definition: 'rouge / red', partOfSpeech: 'adj' },
  { word: 'fotsy', definition: 'blanc / white', partOfSpeech: 'adj' },
  { word: 'mainty', definition: 'noir / black', partOfSpeech: 'adj' },
  { word: 'mafana', definition: 'chaud / hot', partOfSpeech: 'adj' },
  { word: 'mangatsiaka', definition: 'froid / cold', partOfSpeech: 'adj' },
  { word: 'mahafaly', definition: 'heureux / happy', partOfSpeech: 'adj' },
  { word: 'malahelo', definition: 'triste / sad', partOfSpeech: 'adj' },
  { word: 'sambatra', definition: 'bienheureux / blessed', partOfSpeech: 'adj' },
  { word: 'faly', definition: 'content / glad', partOfSpeech: 'adj' },
  { word: 'soa', definition: 'beau, bien / good, nice', partOfSpeech: 'adj' },
  { word: 'hery', definition: 'force / strength', partOfSpeech: 'nom' },
  { word: 'hajaina', definition: 'respecté / respected', partOfSpeech: 'adj' },
  { word: 'tezitra', definition: 'en colère / angry', partOfSpeech: 'adj' },
  { word: 'alahelo', definition: 'tristesse / sadness', partOfSpeech: 'nom' },
  { word: 'fahoriana', definition: 'souffrance / suffering', partOfSpeech: 'nom' },
  { word: 'maty', definition: 'mort / dead', partOfSpeech: 'adj' },
  { word: 'loza', definition: 'danger / danger', partOfSpeech: 'nom' },
  { word: 'fitiavana', definition: 'amour / love', partOfSpeech: 'nom' },
  { word: 'fanantenana', definition: 'espoir / hope', partOfSpeech: 'nom' },
  { word: 'fahamarinana', definition: 'vérité / truth', partOfSpeech: 'nom' },
  { word: 'fahendrena', definition: 'sagesse / wisdom', partOfSpeech: 'nom' },
  { word: 'izaho', definition: 'je / I', partOfSpeech: 'pronom' },
  { word: 'ianao', definition: 'tu / you', partOfSpeech: 'pronom' },
  { word: 'izy', definition: 'il, elle / he, she', partOfSpeech: 'pronom' },
  { word: 'isika', definition: 'nous (inclusif) / we (inclusive)', partOfSpeech: 'pronom' },
  { word: 'izahay', definition: 'nous (exclusif) / we (exclusive)', partOfSpeech: 'pronom' },
  { word: 'ianareo', definition: 'vous / you (plural)', partOfSpeech: 'pronom' },
  { word: 'izy ireo', definition: 'ils, elles / they', partOfSpeech: 'pronom' },
  { word: 'ny', definition: 'le, la, les / the', partOfSpeech: 'article' },
  { word: 'dia', definition: 'alors / then', partOfSpeech: 'conj' },
  { word: 'ary', definition: 'et / and', partOfSpeech: 'conj' },
  { word: 'sy', definition: 'et / and', partOfSpeech: 'conj' },
  { word: 'fa', definition: 'mais / but', partOfSpeech: 'conj' },
  { word: 'satria', definition: 'parce que / because', partOfSpeech: 'conj' },
  { word: 'raha', definition: 'si / if', partOfSpeech: 'conj' },
  { word: 'noho', definition: 'à cause de / because of', partOfSpeech: 'prép' },
  { word: 'ao', definition: 'là (dedans) / there (inside)', partOfSpeech: 'adv' },
  { word: 'eto', definition: 'ici / here', partOfSpeech: 'adv' },
  { word: 'any', definition: 'là-bas / there', partOfSpeech: 'adv' },
  { word: 'Madagasikara', definition: 'Madagascar', partOfSpeech: 'nom propre' },
  { word: 'malagasy', definition: 'malgache / Malagasy', partOfSpeech: 'adj' },
  { word: 'sekoly', definition: 'école / school', partOfSpeech: 'nom' },
  { word: 'mpianatra', definition: 'élève / student', partOfSpeech: 'nom' },
  { word: 'mpampianatra', definition: 'enseignant / teacher', partOfSpeech: 'nom' },
  { word: 'boky', definition: 'livre / book', partOfSpeech: 'nom' },
  { word: 'teny', definition: 'mot, parole / word, speech', partOfSpeech: 'nom' },
  { word: 'fiteny', definition: 'langue / language', partOfSpeech: 'nom' },
  { word: 'fotoana', definition: 'temps / time', partOfSpeech: 'nom' },
  { word: 'ora', definition: 'heure / hour', partOfSpeech: 'nom' },
  { word: 'minitra', definition: 'minute / minute', partOfSpeech: 'nom' },
  { word: 'herinandro', definition: 'semaine / week', partOfSpeech: 'nom' },
  { word: 'volana', definition: 'mois, lune / month, moon', partOfSpeech: 'nom' },
  { word: 'taona', definition: 'année / year', partOfSpeech: 'nom' },
  { word: 'sakafo', definition: 'nourriture / food', partOfSpeech: 'nom' },
  { word: 'mofo', definition: 'pain / bread', partOfSpeech: 'nom' },
  { word: 'hena', definition: 'viande / meat', partOfSpeech: 'nom' },
  { word: 'voankazo', definition: 'fruit / fruit', partOfSpeech: 'nom' },
  { word: 'voatabia', definition: 'tomate / tomato', partOfSpeech: 'nom' },
  { word: 'tongolo', definition: 'oignon / onion', partOfSpeech: 'nom' },
  { word: 'omby', definition: 'boeuf / cattle', partOfSpeech: 'nom' },
  { word: 'kisoa', definition: 'porc / pig', partOfSpeech: 'nom' },
  { word: 'akoho', definition: 'poulet / chicken', partOfSpeech: 'nom' },
  { word: 'alika', definition: 'chien / dog', partOfSpeech: 'nom' },
  { word: 'saka', definition: 'chat / cat', partOfSpeech: 'nom' },
  { word: 'vorona', definition: 'oiseau / bird', partOfSpeech: 'nom' },
  { word: 'varika', definition: 'lémurien / lemur', partOfSpeech: 'nom' },
  { word: 'lalana', definition: 'chemin, route / road, path', partOfSpeech: 'nom' },
  { word: 'fiara', definition: 'voiture / car', partOfSpeech: 'nom' },
  { word: 'sambo', definition: 'bateau / boat', partOfSpeech: 'nom' },
  { word: 'fiaramanidina', definition: 'avion / airplane', partOfSpeech: 'nom' },
  { word: 'vola', definition: 'argent / money', partOfSpeech: 'nom' },
  { word: 'asa', definition: 'travail / work', partOfSpeech: 'nom' },
  { word: 'fianakaviana', definition: 'famille / family', partOfSpeech: 'nom' },
  { word: 'ray', definition: 'père / father', partOfSpeech: 'nom' },
  { word: 'reny', definition: 'mère / mother', partOfSpeech: 'nom' },
  { word: 'anadahy', definition: 'frère / brother', partOfSpeech: 'nom' },
  { word: 'anabavy', definition: 'soeur / sister', partOfSpeech: 'nom' },
  { word: 'zanaka', definition: 'enfant (fils/fille) / child', partOfSpeech: 'nom' },
  { word: 'namana', definition: 'ami / friend', partOfSpeech: 'nom' },
  { word: 'manao', definition: 'faire / to do', partOfSpeech: 'verbe', root: 'atao' },
  { word: 'mahita', definition: 'voir / to see', partOfSpeech: 'verbe', root: 'hita' },
  { word: 'mandre', definition: 'entendre / to hear', partOfSpeech: 'verbe', root: 'andre' },
  { word: 'mihinana', definition: 'manger / to eat', partOfSpeech: 'verbe', root: 'hinana' },
  { word: 'misotro', definition: 'boire / to drink', partOfSpeech: 'verbe', root: 'sotro' },
  { word: 'matory', definition: 'dormir / to sleep', partOfSpeech: 'verbe', root: 'atory' },
  { word: 'mitsangana', definition: 'se lever / to stand up', partOfSpeech: 'verbe', root: 'tsangana' },
  { word: 'mipetraka', definition: 'habiter, s\'asseoir / to live, to sit', partOfSpeech: 'verbe', root: 'petraka' },
  { word: 'milaza', definition: 'dire / to say', partOfSpeech: 'verbe', root: 'lazaina' },
  { word: 'manoratra', definition: 'écrire / to write', partOfSpeech: 'verbe', root: 'soratra' },
  { word: 'mamaky', definition: 'lire / to read', partOfSpeech: 'verbe', root: 'vaky' },
  { word: 'mitia', definition: 'aimer / to love', partOfSpeech: 'verbe', root: 'tia' },
  { word: 'mahalala', definition: 'savoir / to know', partOfSpeech: 'verbe', root: 'halala' },
  { word: 'afaka', definition: 'pouvoir, libre / can, free', partOfSpeech: 'verbe' },
  { word: 'tokony', definition: 'devoir / should', partOfSpeech: 'adv' },
  { word: 'tsy', definition: 'ne...pas / not', partOfSpeech: 'adv' },
  { word: 'efa', definition: 'déjà / already', partOfSpeech: 'adv' },
  { word: 'mbola', definition: 'encore / still', partOfSpeech: 'adv' },
  { word: 'vao', definition: 'juste / just (recently)', partOfSpeech: 'adv' },
];

export class MalagasyDictionary {
  private static instance: MalagasyDictionary;
  private wordSet: Set<string> = new Set();
  private entries: Map<string, DictionaryEntry> = new Map();
  private sortedWords: string[] = [];
  private loaded = false;

  private constructor() {}

  /** Get singleton instance */
  static getInstance(): MalagasyDictionary {
    if (!MalagasyDictionary.instance) {
      MalagasyDictionary.instance = new MalagasyDictionary();
    }
    return MalagasyDictionary.instance;
  }

  /** Load the dictionary data */
  async load(externalEntries?: DictionaryEntry[]): Promise<void> {
    if (this.loaded) return;

    const allEntries = [...BUILTIN_WORDS, ...(externalEntries || [])];

    for (const entry of allEntries) {
      const lower = entry.word.toLowerCase();
      this.wordSet.add(lower);
      this.entries.set(lower, entry);
    }

    this.sortedWords = Array.from(this.wordSet).sort();
    this.loaded = true;
  }

  /** Check if a word exists and get suggestions */
  lookup(word: string, maxSuggestions = 5): LookupResult {
    const lower = word.toLowerCase();
    const entry = this.entries.get(lower);

    if (entry) {
      return { exists: true, suggestions: [], definition: entry.definition };
    }

    // Fuzzy search using Levenshtein distance
    const suggestions = this.fuzzySearch(lower, maxSuggestions);
    return { exists: false, suggestions };
  }

  /** Check if word exists in dictionary */
  exists(word: string): boolean {
    return this.wordSet.has(word.toLowerCase());
  }

  /** Get definition for a word */
  getDefinition(word: string): string | undefined {
    return this.entries.get(word.toLowerCase())?.definition;
  }

  /** Get entry for a word */
  getEntry(word: string): DictionaryEntry | undefined {
    return this.entries.get(word.toLowerCase());
  }

  /** Fuzzy search for approximate matches using Levenshtein distance */
  fuzzySearch(query: string, maxResults = 5, maxDistance = 3): string[] {
    const results: Array<{ word: string; distance: number }> = [];

    for (const word of this.sortedWords) {
      // Skip words too different in length
      if (Math.abs(word.length - query.length) > maxDistance) continue;

      const distance = levenshtein.get(query, word);
      if (distance <= maxDistance && distance > 0) {
        results.push({ word, distance });
      }
    }

    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults)
      .map((r) => r.word);
  }

  /** Get all words (for autocomplete, etc.) */
  getAllWords(): string[] {
    return this.sortedWords;
  }

  /** Get word count */
  get size(): number {
    return this.wordSet.size;
  }

  /** Check if dictionary is loaded */
  get isLoaded(): boolean {
    return this.loaded;
  }
}
