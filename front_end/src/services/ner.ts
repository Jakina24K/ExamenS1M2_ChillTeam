/**
 * Named Entity Recognition helpers for Malagasy labels.
 * The frontend still keeps a local extractor for fallback and utility use,
 * while the main editor now consumes backend NER results.
 */

export type EntityType =
  | "city"
  | "region"
  | "person"
  | "date"
  | "number"
  | "country"
  | "City"
  | "Province"
  | "Name"
  | "Region";

export interface NamedEntity {
  word: string;
  type: EntityType;
  position: number;
  length: number;
}

const CITIES = new Set([
  "antananarivo", "toamasina", "mahajanga", "fianarantsoa", "toliara",
  "antsirabe", "ambovombe", "ambanja", "antsiranana", "mananjary",
  "antsirananana", "morondava", "ambatondrazaka", "nosy be", "sainte-marie",
  "manakara", "farafangana", "ambositra", "ihosy", "moramanga",
  "miarinarivo", "tsiroanomandidy", "maintirano", "analalava",
  "maroantsetra", "sambava", "vohemar", "andapa", "ambalavao",
  "betafo", "ankazobe", "arivonimamo", "ambatolampy", "betioky",
]);

const REGIONS = new Set([
  "analamanga", "atsinanana", "diana", "sava", "boeny", "betsiboka",
  "melaky", "alaotra-mangoro", "analanjirofo", "vatovavy", "fitovinany",
  "atsimo-atsinanana", "ihorombe", "menabe", "vakinankaratra",
  "amoron'i mania", "haute matsiatra", "atsimo-andrefana", "androy",
  "anosy", "sofia", "itasy", "bongolava",
]);

const PERSON_NAMES = new Set([
  "rasoa", "rabe", "rakoto", "ravao", "razafy", "raharinirina",
  "andry", "hery", "nomena", "fidy", "tiana", "voahangy",
  "haingo", "mialy", "ny aina", "hasina", "lalao", "rija",
  "nirina", "fara", "vola", "zo", "bodo", "lova", "koto",
  "noro", "tojo", "soa", "rina", "anja", "mamy", "lanto",
  "faniry", "henintsoa", "fitia", "mahery", "toky",
  "rainilaiarivony", "ranavalona", "andrianampoinimerina", "radama",
]);

const COUNTRIES = new Set([
  "madagasikara", "frantsa", "etazonia", "shinoa", "india",
  "japon", "alemaina", "angletera", "italia", "espaina",
  "afrikatsimo", "morisy", "komoro", "reunion", "seychelles",
]);

const DATE_PATTERNS = [
  /\b(\d{1,2})\s+(janoary|febroary|martsa|aprily|mey|jona|jolay|aogositra|septambra|oktobra|novambra|desambra)\s*(\d{4})?\b/gi,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  /\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b/g,
];

const NUMBER_PATTERNS = [
  /\b\d+([.,]\d+)?\b/g,
  /\b(iray|roa|telo|efatra|dimy|enina|fito|valo|sivy|folo|zato|arivo)\b/gi,
];

export function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];
  const lower = text.toLowerCase();
  const wordRegex = /\b[\w'À-ÿ-]+\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(lower)) !== null) {
    const word = match[0];
    const position = match.index;

    if (CITIES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: "city", position, length: word.length });
    } else if (REGIONS.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: "region", position, length: word.length });
    } else if (PERSON_NAMES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: "person", position, length: word.length });
    } else if (COUNTRIES.has(word)) {
      entities.push({ word: text.slice(position, position + word.length), type: "country", position, length: word.length });
    }
  }

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({ word: match[0], type: "date", position: match.index, length: match[0].length });
    }
  }

  for (const pattern of NUMBER_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const isPartOfDate = entities.some(
        (entity) => entity.type === "date" && match!.index >= entity.position && match!.index < entity.position + entity.length,
      );

      if (!isPartOfDate) {
        entities.push({ word: match[0], type: "number", position: match.index, length: match[0].length });
      }
    }
  }

  return entities.sort((a, b) => a.position - b.position);
}

export function getEntityLabel(type: EntityType): string {
  switch (type) {
    case "city":
    case "City":
      return "Tanana";
    case "region":
    case "Region":
      return "Faritra";
    case "Province":
      return "Faritany";
    case "person":
    case "Name":
      return "Olona";
    case "date":
      return "Daty";
    case "number":
      return "Isa";
    case "country":
      return "Firenena";
    default:
      return type;
  }
}
