# ============================================================
#  NLPM2 – Malagasy Augmented Text Editor · Backend
#  logic.py v2 – MalagasyAnalyzer refactorisé
# ============================================================
#
#  Améliorations v2 :
#  ├── Lexique chargé depuis JSON (via data_loader.py)
#  ├── Corpus N-gram enrichi via Wikipedia Malagasy
#  ├── RapidFuzz activé automatiquement si installé
#  ├── Tokeniseur dédié (tokenizer.py)
#  └── get_root() : table de mutations consonantiques complète
#       avec système d'hypothèses multiples et scoring lexical
#
# ============================================================

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import defaultdict
from typing import Any

logger = logging.getLogger("nlpm2.logic")

from tokenizer import MalagasyTokenizer
from data_loader import LexiconLoader, CorpusLoader

try:
    from rapidfuzz import process as rf_process, fuzz
    RAPIDFUZZ_AVAILABLE = True
    logger.info("RapidFuzz activé.")
except ImportError:
    RAPIDFUZZ_AVAILABLE = False
    logger.warning("RapidFuzz non installé – suggestions Levenshtein désactivées.")


# ════════════════════════════════════════════════════════════
#  1. TABLE DE MUTATIONS CONSONANTIQUES
# ════════════════════════════════════════════════════════════
#
#  RÉFÉRENCE :
#    Rajemisa-Raolison, Régis (1971). Grammaire Malagasy.
#    Abinal & Malzac (1888 / rééd. 1987). Dictionnaire Malagasy-Français.
#
#  TROIS MÉCANISMES DE MUTATION avec man- :
#
#  ┌──────────────────┬──────────────────────────────────────────────┐
#  │ Mécanisme        │ Exemples                                      │
#  ├──────────────────┼──────────────────────────────────────────────┤
#  │ 1. ÉLISION       │ man + tosika  → manosika  (t disparu)        │
#  │    consonne      │ man + fidy    → manidy    (f disparu)        │
#  │    initiale      │ man + ditra   → manitra   (d disparu)        │
#  │    disparaît     │ man + tsabo   → manabo    (ts disparu)       │
#  ├──────────────────┼──────────────────────────────────────────────┤
#  │ 2. ASSIMILATION  │ man + boly    → mamboly   (n→m avant b)      │
#  │    nasale        │ man + petaka  → mampetaka (n→mp avant p)     │
#  │    préfixe mute  │ man + vidy    → mamvidy   (n→m avant v)      │
#  ├──────────────────┼──────────────────────────────────────────────┤
#  │ 3. INSERTION     │ man + roso    → mandroso  (d épenthétique)   │
#  │    euphonique    │ man + ritra   → mandritra (idem)             │
#  ├──────────────────┼──────────────────────────────────────────────┤
#  │ 4. CONSERVATION  │ man + kibo    → mankibo   (k inchangé)       │
#  │    (pas de mut.) │ man + zaka    → manzaka                      │
#  └──────────────────┴──────────────────────────────────────────────┘
#
#  RECONSTRUCTION INVERSE :
#  Quand on strip 'man-' et que le stem commence par une VOYELLE
#  → la consonne originale était élidée : essayer t, f, d, ts
#  Quand le stem commence par 'nd' → insertion d épenthétique : r+stem[2:]
#  Quand préfixe = 'mam-' → assimilation : consonne originale b ou v
#  Quand préfixe = 'mamp-' → assimilation : consonne originale p
#
# ════════════════════════════════════════════════════════════

# Consonnes élidées par man- (ordre fréquence décroissante)
MAN_ELIDED_CONSONANTS: list[str] = ["t", "f", "d", "ts"]


class LemmaHypothesis:
    """Hypothèse de lemme avec score de confiance."""
    __slots__ = ("root", "prefix_removed", "suffix_removed", "confidence", "note")

    def __init__(
        self,
        root: str,
        prefix_removed: str | None,
        suffix_removed: str | None,
        confidence: float,
        note: str = "",
    ) -> None:
        self.root = root
        self.prefix_removed = prefix_removed
        self.suffix_removed = suffix_removed
        self.confidence = confidence
        self.note = note

    def to_dict(self) -> dict:
        return {
            "racine":          self.root,
            "prefixe_retire":  self.prefix_removed,
            "suffixe_retire":  self.suffix_removed,
            "score_confiance": round(self.confidence, 3),
            "note":            self.note,
        }


# ── Reconstructeurs par préfixe ──────────────────────────────

def _reconstruct_man(
    stem: str, lexicon: set[str]
) -> list[LemmaHypothesis]:
    """
    Reconstruction après stripping de 'man-'.

    Cas 1 – stem commence par voyelle (a/e/i/o/u)
        → consonne originale élidée : tester t, f, d, ts
        → score +0.5 si candidat trouvé dans lexique
        → bonus de fréquence : t=+0.10, f=+0.08, d=+0.06, ts=+0.03

    Cas 2 – stem commence par 'nd'
        → insertion épenthétique de d après man + r
        → racine = 'r' + stem[2:]   ex: ndroso → roso

    Cas 3 – stem commence par consonne ordinaire
        → pas d'élision → racine = stem
    """
    hypotheses: list[LemmaHypothesis] = []

    # ── Cas 1 : élision consonantique ──
    if stem and stem[0].lower() in "aeiou":
        freq_bonus = {"t": 0.10, "f": 0.08, "d": 0.06, "ts": 0.03}
        for cons in MAN_ELIDED_CONSONANTS:
            candidate = cons + stem
            in_lex = candidate in lexicon
            base = 0.55 if in_lex else 0.25
            score = min(base + freq_bonus.get(cons, 0), 0.95)
            hypotheses.append(LemmaHypothesis(
                root=candidate,
                prefix_removed="man-",
                suffix_removed=None,
                confidence=score,
                note=(
                    f"Élision de '{cons}' par man- "
                    f"{'[LEXIQUE ✓]' if in_lex else '[hypothèse]'}"
                ),
            ))
        # Fallback : stem sans restitution
        hypotheses.append(LemmaHypothesis(
            root=stem, prefix_removed="man-", suffix_removed=None,
            confidence=0.12,
            note="Fallback : stem brut sans restitution consonantique",
        ))

    # ── Cas 2 : insertion d épenthétique (man + r → mandr) ──
    elif re.match(r"^nd", stem, re.IGNORECASE):
        r_stem = "r" + stem[2:]  # ndroso → roso
        in_lex = r_stem in lexicon
        hypotheses.append(LemmaHypothesis(
            root=r_stem,
            prefix_removed="man-",
            suffix_removed=None,
            confidence=0.82 if in_lex else 0.52,
            note="Insertion d épenthétique : man + r → mandr",
        ))

    # ── Cas 3 : consonne conservée ──
    else:
        in_lex = stem in lexicon
        hypotheses.append(LemmaHypothesis(
            root=stem,
            prefix_removed="man-",
            suffix_removed=None,
            confidence=0.75 if in_lex else 0.40,
            note="Consonne initiale conservée (pas d'élision)",
        ))

    return hypotheses


def _reconstruct_mamp(
    stem: str, lexicon: set[str]
) -> list[LemmaHypothesis]:
    """
    Reconstruction après 'mamp-'.
    Assimilation nasale : man + p → mamp, racine originale = p + stem.
    """
    if stem and stem[0].lower() in "aeiou":
        candidate = "p" + stem
        in_lex = candidate in lexicon
        return [LemmaHypothesis(
            root=candidate,
            prefix_removed="mamp-",
            suffix_removed=None,
            confidence=0.82 if in_lex else 0.48,
            note="Assimilation man→mamp devant p (restitution du p)",
        )]
    in_lex = stem in lexicon
    return [LemmaHypothesis(
        root=stem, prefix_removed="mamp-", suffix_removed=None,
        confidence=0.72 if in_lex else 0.38,
        note="mamp- devant consonne",
    )]


def _reconstruct_mam(
    stem: str, lexicon: set[str]
) -> list[LemmaHypothesis]:
    """
    Reconstruction après 'mam-'.
    Assimilation nasale : man + b/v → mam, racine originale = b|v + stem.
    """
    for cons in ["b", "v"]:
        candidate = cons + stem
        if candidate in lexicon:
            return [LemmaHypothesis(
                root=candidate,
                prefix_removed="mam-",
                suffix_removed=None,
                confidence=0.88,
                note=f"Assimilation man→mam devant {cons} [LEXIQUE ✓]",
            )]
    # Hypothèse par défaut : b (plus fréquent que v)
    return [LemmaHypothesis(
        root="b" + stem,
        prefix_removed="mam-",
        suffix_removed=None,
        confidence=0.38,
        note="Assimilation man→mam devant bilabiale (hypothèse b)",
    )]


def _simple_reconstructor(
    label: str,
) -> "Callable[[str, set[str]], list[LemmaHypothesis]]":
    """Fabrique pour préfixes sans mutation consonantique."""
    def _fn(stem: str, lexicon: set[str]) -> list[LemmaHypothesis]:
        in_lex = stem in lexicon
        return [LemmaHypothesis(
            root=stem,
            prefix_removed=label,
            suffix_removed=None,
            confidence=0.76 if in_lex else 0.34,
            note=f"Stripping direct de {label}",
        )]
    return _fn


# ── Table des préfixes (ordre : plus long → plus court) ──────
PREFIX_TABLE: list[tuple[str, Any]] = [
    ("mamp",  _reconstruct_mamp),
    ("mana",  _simple_reconstructor("mana-")),
    ("maha",  _simple_reconstructor("maha-")),
    ("mamo",  _simple_reconstructor("mamo-")),
    ("mam",   _reconstruct_mam),
    ("man",   _reconstruct_man),
    ("mai",   _simple_reconstructor("mai-")),
    ("mi",    _simple_reconstructor("mi-")),
    ("ma",    _simple_reconstructor("ma-")),
    ("famp",  _simple_reconstructor("famp-")),
    ("fana",  _simple_reconstructor("fana-")),
    ("faha",  _simple_reconstructor("faha-")),
    ("fan",   _simple_reconstructor("fan-")),
    ("fam",   _simple_reconstructor("fam-")),
    ("fi",    _simple_reconstructor("fi-")),
    ("fa",    _simple_reconstructor("fa-")),
    ("ha",    _simple_reconstructor("ha-")),
    ("an",    _simple_reconstructor("an-")),
    ("am",    _simple_reconstructor("am-")),
]

# ── Suffixes (ordre : plus long → plus court) ────────────────
SUFFIX_TABLE: list[tuple[str, str]] = [
    ("ana",  "-ana"),
    ("ina",  "-ina"),
    ("ko",   "-ko"),
    ("nao",  "-nao"),
    ("ny",   "-ny"),
    ("na",   "-na"),
]

# ── Clusters phonotactiques interdits ────────────────────────
FORBIDDEN_CLUSTERS: list[tuple[str, str]] = [
    (r"\bnb",          "nb en début de mot"),
    (r"\bmk",          "mk en début de mot"),
    (r"\bdt",          "dt en début de mot"),
    (r"\bbp",          "bp en début de mot"),
    (r"\bsz",          "sz en début de mot"),
    (r"(?<![nmñ])nk",  "nk sans nasale précédente"),
    (r"[^aeiou]{4,}",  "4+ consonnes consécutives"),
    (r"\btl",          "tl en début de mot"),
    (r"\bsr",          "sr en début de mot"),
    (r"[aeiou]{4,}",   "4+ voyelles consécutives"),
]

FORBIDDEN_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(p, re.IGNORECASE), desc)
    for p, desc in FORBIDDEN_CLUSTERS
]


# ════════════════════════════════════════════════════════════
#  2. CLASSE PRINCIPALE
# ════════════════════════════════════════════════════════════

class MalagasyAnalyzer:
    """
    Moteur NLP Malagasy v2.

    Cycle de vie :
      1. __init__()       – construction légère
      2. initialize()     – chargement des ressources JSON (startup)
      3. analyze(text)    – pipeline NLP complet (async)
    """

    def __init__(self) -> None:
        self._reference_lexicon: set[str] = set()
        self._sentiment_lexicon: dict[str, int] = {}
        self._ngram_model: dict[tuple, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        self._order = 2
        self._tokenizer = MalagasyTokenizer(
            expand_contractions=True,
            keep_hyphens=True,
        )
        self._initialized = False

    # ── Initialisation ───────────────────────────────────────

    def initialize(
        self,
        lexicon_path=None,
        sentiment_path=None,
        corpus_path=None,
    ) -> None:
        """
        Charge toutes les ressources depuis les fichiers JSON.
        Doit être appelé depuis le lifespan FastAPI au démarrage.
        """
        t = time.perf_counter()

        self._reference_lexicon = LexiconLoader.load_reference_lexicon(lexicon_path)
        self._sentiment_lexicon = LexiconLoader.load_sentiment_lexicon(sentiment_path)
        sentences = CorpusLoader.load_seed_corpus(corpus_path)
        self._build_ngram_model(sentences)

        self._initialized = True
        elapsed = round((time.perf_counter() - t) * 1000, 1)
        logger.info(
            "Analyzer initialisé en %s ms | lexique=%d | corpus=%d phrases",
            elapsed,
            len(self._reference_lexicon),
            len(sentences),
        )

    async def enrich_from_wikipedia(
        self,
        pages: list[str] | None = None,
        max_sentences: int = 500,
    ) -> dict:
        """
        Récupère des phrases depuis Wikipedia Malagasy et enrichit
        le modèle N-gram. Peut être appelé via un endpoint admin.
        """
        from data_loader import WikipediaMgLoader
        loader = WikipediaMgLoader()
        sentences = await loader.fetch_sentences(pages, max_sentences)
        if sentences:
            added = self.feed_corpus(sentences)
            CorpusLoader.save_corpus(sentences)
            return {
                "status": "ok",
                "sentences_added": len(sentences),
                "new_ngrams": added,
            }
        return {"status": "empty", "sentences_added": 0, "new_ngrams": 0}

    # ────────────────────────────────────────────────────────
    #  MODULE 1 · Phonotactique
    # ────────────────────────────────────────────────────────

    @staticmethod
    def check_phonotactics(tokens: list[str]) -> list[dict]:
        """Détecte les clusters consonantiques interdits en Malagasy."""
        errors: list[dict] = []
        for pos, token in enumerate(tokens):
            clean = token.lower().strip(".,!?;:'\"")
            for pattern, description in FORBIDDEN_PATTERNS:
                match = pattern.search(clean)
                if match:
                    errors.append({
                        "token":            token,
                        "position":         pos,
                        "cluster_interdit": match.group(0),
                        "type_erreur":      "PHONOTACTIQUE",
                        "description":      description,
                        "score_confiance":  1.0,
                    })
                    break
        return errors

    # ────────────────────────────────────────────────────────
    #  MODULE 2 · Lemmatisation avec mutations consonantiques
    # ────────────────────────────────────────────────────────

    def get_root(
        self,
        word: str,
        return_all_hypotheses: bool = False,
    ) -> dict:
        """
        Déconstruit un mot Malagasy pour trouver sa/ses racine(s).

        Algorithme v2 :
          1. Strip du préfixe reconnu (plus long en premier)
          2. Appel du reconstructeur consonantique spécifique
             au préfixe (gestion des 3 mécanismes de mutation)
          3. Strip du suffixe sur chaque hypothèse de stem
          4. Scoring composite :
               +0.55 si racine dans lexique de référence
               +0.10 bonus selon fréquence de la consonne élidée
               -0.05 pénalité si suffixe strip donne racine hors lexique
          5. Tri par score décroissant → meilleure hypothèse

        Exemples documentés :
          manosika → tosika  (man- + élision t + aucun suffixe)
          manidy   → fidy    (man- + élision f)
          mandroso → roso    (man- + insertion d épenthétique : r)
          mamboly  → boly    (mam- assimilation b)
          mampetaka→ petaka  (mamp- assimilation p)
          fianatry → anatra  (fi- + suffix -na → anatra)
          novakina → vaky    (no- préfixe passé + suffix -ina → vaky)

        Args:
            word: mot à lemmatiser.
            return_all_hypotheses: retourner toutes les hypothèses.

        Returns:
            dict { racine, prefixe_retire, suffixe_retire,
                   score_confiance, note [, hypotheses] }
        """
        original = word.lower().strip()
        hypotheses: list[LemmaHypothesis] = []

        # ── Étape 1 : Identification du préfixe ──
        matched_stem: str = original
        matched_fn = None

        for prefix, reconstruct_fn in PREFIX_TABLE:
            min_stem_len = 3  # une racine doit avoir au moins 3 caractères
            if (
                original.startswith(prefix)
                and len(original) > len(prefix) + min_stem_len
            ):
                matched_stem = original[len(prefix):]
                matched_fn = reconstruct_fn
                break

        # ── Étape 2 : Reconstruction consonantique ──
        if matched_fn:
            raw_hyps = matched_fn(matched_stem, self._reference_lexicon)
        else:
            # Aucun préfixe → peut-être déjà une racine
            in_lex = original in self._reference_lexicon
            raw_hyps = [LemmaHypothesis(
                root=original,
                prefix_removed=None,
                suffix_removed=None,
                confidence=0.90 if in_lex else 0.28,
                note="Aucun préfixe reconnu – mot potentiellement déjà une racine",
            )]

        # ── Étape 3 : Strip du suffixe sur chaque hypothèse ──
        for hyp in raw_hyps:
            stripped, suffix_label = _strip_suffix(hyp.root)
            if suffix_label and len(stripped) >= 3:
                in_lex_stripped = stripped in self._reference_lexicon
                bonus = 0.15 if in_lex_stripped else -0.05
                hypotheses.append(LemmaHypothesis(
                    root=stripped,
                    prefix_removed=hyp.prefix_removed,
                    suffix_removed=suffix_label,
                    confidence=min(hyp.confidence + bonus, 0.98),
                    note=hyp.note + f" | suffixe {suffix_label} retiré",
                ))
            # Hypothèse sans strip du suffixe (toujours conservée)
            hypotheses.append(hyp)

        # ── Étape 4 : Tri et sélection ──
        valid = sorted(
            [h for h in hypotheses if len(h.root) >= 3],
            key=lambda h: h.confidence,
            reverse=True,
        )
        if not valid:
            valid = hypotheses

        best = valid[0]

        result = {
            "racine":          best.root,
            "prefixe_retire":  best.prefix_removed,
            "suffixe_retire":  best.suffix_removed,
            "score_confiance": round(best.confidence, 3),
            "note":            best.note,
        }

        if return_all_hypotheses:
            result["hypotheses"] = [h.to_dict() for h in valid[:5]]

        return result

    # ────────────────────────────────────────────────────────
    #  MODULE 3 · Sentiment (BoW)
    # ────────────────────────────────────────────────────────

    def score_sentiment(self, tokens: list[str]) -> dict:
        """Scoring BoW depuis sentiment_lexicon.json."""
        score = 0
        pos_hits: list[str] = []
        neg_hits: list[str] = []

        for token in tokens:
            clean = token.lower().strip(".,!?;:'\"")
            if clean in self._sentiment_lexicon:
                p = self._sentiment_lexicon[clean]
                score += p
                (pos_hits if p > 0 else neg_hits).append(clean)

        nb = len(pos_hits) + len(neg_hits)
        label = "Neutre" if score == 0 else ("Positif" if score > 0 else "Négatif")

        return {
            "label":            label,
            "score":            score,
            "mots_positifs":    pos_hits,
            "mots_negatifs":    neg_hits,
            "nb_mots_analyses": nb,
            "score_confiance":  round(abs(score) / max(nb, 1), 2),
        }

    # ────────────────────────────────────────────────────────
    #  MODULE 4 · Prédiction N-gram
    # ────────────────────────────────────────────────────────

    def _build_ngram_model(self, corpus: list[str]) -> None:
        for sentence in corpus:
            words = sentence.lower().split()
            for i in range(len(words) - self._order):
                ctx = tuple(words[i: i + self._order])
                self._ngram_model[ctx][words[i + self._order]] += 1

    def predict_next_word(self, text: str, n: int = 3) -> list[str]:
        """Prédit les n mots probables avec backoff unigramme."""
        toks = self._tokenizer.tokenize(text)
        words = [t.normalized.lower() for t in toks]

        if len(words) >= self._order:
            candidates = dict(
                self._ngram_model.get(tuple(words[-self._order:]), {})
            )
        elif words:
            last = words[-1]
            candidates: dict[str, int] = {}
            for k, v in self._ngram_model.items():
                if k[-1] == last:
                    for w, c in v.items():
                        candidates[w] = candidates.get(w, 0) + c
        else:
            return []

        if not candidates:
            return []

        return [w for w, _ in sorted(candidates.items(), key=lambda x: x[1], reverse=True)[:n]]

    def feed_corpus(self, sentences: list[str]) -> int:
        """Enrichit le N-gram. Retourne le nombre de nouveaux n-grams."""
        before = sum(len(v) for v in self._ngram_model.values())
        self._build_ngram_model(sentences)
        return sum(len(v) for v in self._ngram_model.values()) - before

    # ────────────────────────────────────────────────────────
    #  MODULE 5 · Suggestions Levenshtein (RapidFuzz)
    # ────────────────────────────────────────────────────────

    def suggest_corrections(
        self,
        tokens: list[str],
        threshold: int = 78,
        max_suggestions: int = 3,
    ) -> dict[str, list[dict]]:
        """
        Suggestions via RapidFuzz (activé automatiquement si installé).
        Retourne {} si RapidFuzz non disponible.
        """
        if not RAPIDFUZZ_AVAILABLE or not self._reference_lexicon:
            return {}

        suggestions: dict[str, list[dict]] = {}
        for token in tokens:
            clean = token.lower().strip(".,!?;:'\"")
            if not clean or clean in self._reference_lexicon:
                continue
            matches = rf_process.extract(
                clean,
                self._reference_lexicon,
                scorer=fuzz.ratio,
                limit=max_suggestions,
                score_cutoff=threshold,
            )
            if matches:
                suggestions[token] = [
                    {
                        "suggestion": m[0],
                        "score_similarite": round(m[1] / 100, 2),
                    }
                    for m in matches
                ]
        return suggestions

    # ────────────────────────────────────────────────────────
    #  ORCHESTRATEUR
    # ────────────────────────────────────────────────────────

    async def analyze(self, text: str) -> dict[str, Any]:
        """Pipeline NLP complet – toutes tâches CPU via asyncio.to_thread()."""
        t_start = time.perf_counter()

        # Tokenisation (gère apostrophes, tirets, redoublement)
        tokens_obj = self._tokenizer.tokenize(text)
        tokens_str = [t.text for t in tokens_obj]
        tokens_meta = [t.to_dict() for t in tokens_obj]

        # Tâches parallèles
        phonotactic_errors, sentiment, suggestions = await asyncio.gather(
            asyncio.to_thread(self.check_phonotactics, tokens_str),
            asyncio.to_thread(self.score_sentiment, tokens_str),
            asyncio.to_thread(self.suggest_corrections, tokens_str),
        )

        # Lemmatisation (synchrone rapide)
        lemmas = [
            {"token": t.text, **self.get_root(t.text)}
            for t in tokens_obj
        ]

        # Prédiction N-gram
        predictions = await asyncio.to_thread(self.predict_next_word, text)

        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)

        return {
            "tokens":               tokens_str,
            "tokens_enrichis":      tokens_meta,
            "lemmas":               lemmas,
            "phonotactic_errors":   phonotactic_errors,
            "suggestions":          suggestions,
            "sentiment":            sentiment,
            "next_word_predictions":predictions,
            "metadata": {
                "nb_tokens":                 len(tokens_str),
                "nb_erreurs_phonotactiques": len(phonotactic_errors),
                "duree_traitement_ms":       elapsed_ms,
                "rapidfuzz_disponible":      RAPIDFUZZ_AVAILABLE,
                "taille_lexique":            len(self._reference_lexicon),
                "initialized":               self._initialized,
            },
        }


# ════════════════════════════════════════════════════════════
#  3. UTILITAIRES INTERNES
# ════════════════════════════════════════════════════════════

def _strip_suffix(stem: str) -> tuple[str, str | None]:
    """Retire le premier suffixe applicable. Retourne (racine, label|None)."""
    for suffix, label in SUFFIX_TABLE:
        if stem.endswith(suffix) and len(stem) > len(suffix) + 2:
            return stem[: -len(suffix)], label
    return stem, None
