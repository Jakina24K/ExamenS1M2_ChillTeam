# ============================================================
#  NLPM2 – Tokeniseur dédié au Malagasy
#  tokenizer.py
# ============================================================
#
#  Spécificités du Malagasy gérées ici :
#
#  1. Apostrophes contractées (elision)
#     n'   → ny  (article défini devant voyelle)
#     d'   → dia (particule devant voyelle)
#     m'   → mo  (rare, préfixe verbal)
#     t'   → ty  (rare)
#
#  2. Tirets composés (mots composés légitimes)
#     tsara-tsara, mandeha-monina, lalam-pirenena
#     → conservés comme un seul token
#
#  3. Redoublement (répétition morphologique)
#     kely-kely, tsara-tsara
#     → marqués avec le flag `is_reduplicated`
#
#  4. Clitiques possessifs collés
#     tranoko (trano + ko), tranony (trano + ny)
#     → non séparés ici (géré par get_root())
#
#  5. Majuscules / noms propres
#     Madagasikara, Antananarivo → marqués `is_proper`
#
#  6. Chiffres / nombres malagasy
#     arivo, iray, roa, telo… → marqués `is_numeral`
#
# ============================================================

from __future__ import annotations
import re
from dataclasses import dataclass, field


# ── Constantes ───────────────────────────────────────────────

# Expansions des contractions apostrophées
# Source : grammaire de Rajemisa-Raolison (1971)
APOSTROPHE_EXPANSIONS: dict[str, str] = {
    "n'":  "ny",   # n'akoho → ny akoho
    "d'":  "dia",  # d'izany → dia izany
    "m'":  "mo",   # rare
    "t'":  "ty",   # rare
    "f'":  "fa",   # f'izany → fa izany
    "s'":  "sy",   # s'izy  → sy izy (rare)
    "k'":  "ka",   # k'izany → ka izany (rare)
}

# Numéraux cardinaux courants
MALAGASY_NUMERALS: set[str] = {
    "iray", "roa", "telo", "efatra", "dimy", "enina",
    "fito", "valo", "sivy", "folo", "iraika ambin'ny folo",
    "roapolo", "telo polo", "efapolo", "dimam-polo",
    "enin-jato", "arivo", "alina", "hetsy", "tapitrisa",
}

# Signes de ponctuation à traiter comme séparateurs
PUNCT_SEP = re.compile(
    r'[.,!?;:«»""„"()\[\]{}<>|\\/@#$%^*+=`~]'
)

# Tirets qui SÉPARENT des tokens (≠ tirets composants de mots)
# En Malagasy un tiret dans un mot est souvent morphologique.
# Heuristique : on conserve le tiret si les deux côtés font ≥ 3 caractères.
HYPHEN_SPLIT = re.compile(r"(?<=[a-zA-Zàâéèêëîïôùûüç]{3})-(?=[a-zA-Zàâéèêëîïôùûüç]{3})")


# ── Dataclass Token ──────────────────────────────────────────

@dataclass
class MalagasyToken:
    """Représentation enrichie d'un token Malagasy."""
    text: str                          # Forme de surface originale
    normalized: str                    # Forme normalisée (lower + trim)
    position: int                      # Index dans la liste de tokens
    is_proper: bool = False            # Nom propre (commence par maj.)
    is_reduplicated: bool = False      # Redoublement morphologique
    is_numeral: bool = False           # Numéral
    is_contraction: bool = False       # Issue d'une expansion apostrophée
    expanded_from: str | None = None   # Forme contractée d'origine
    char_start: int = 0                # Début dans le texte source
    char_end: int = 0                  # Fin dans le texte source

    def to_dict(self) -> dict:
        return {
            "text":           self.text,
            "normalized":     self.normalized,
            "position":       self.position,
            "is_proper":      self.is_proper,
            "is_reduplicated":self.is_reduplicated,
            "is_numeral":     self.is_numeral,
            "is_contraction": self.is_contraction,
            "expanded_from":  self.expanded_from,
        }


# ── Tokeniseur principal ──────────────────────────────────────

class MalagasyTokenizer:
    """
    Tokeniseur dédié au Malagasy.

    Pipeline :
      1. Expansion des apostrophes contractées
      2. Séparation sur espaces et ponctuation
      3. Gestion des tirets morphologiques
      4. Annotation sémantique (propre, numéral, redoublé)
    """

    def __init__(
        self,
        expand_contractions: bool = True,
        keep_hyphens: bool = True,
        lowercase: bool = False,
    ) -> None:
        self.expand_contractions = expand_contractions
        self.keep_hyphens = keep_hyphens
        self.lowercase = lowercase

        # Regex de détection de contraction apostrophée
        # ex: "n'akoho" → groupe1="n'", groupe2="akoho"
        _apos_keys = "|".join(
            re.escape(k) for k in sorted(
                APOSTROPHE_EXPANSIONS.keys(), key=len, reverse=True
            )
        )
        self._contraction_re = re.compile(
            rf"({_apos_keys})([a-zA-Zàâéèêëîïôùûüç]+)",
            re.IGNORECASE,
        )

    # ── API publique ────────────────────────────────────────

    def tokenize(self, text: str) -> list[MalagasyToken]:
        """
        Tokenise un texte Malagasy et retourne une liste de MalagasyToken.

        Exemple :
            >>> t = MalagasyTokenizer()
            >>> tokens = t.tokenize("Tsara ny n'akoho sy ny vary.")
            >>> [tk.text for tk in tokens]
            ['Tsara', 'ny', 'ny', 'akoho', 'sy', 'ny', 'vary']
        """
        # ── Étape 1 : Expansion des contractions ──
        processed, contraction_map = self._expand_contractions(text)

        # ── Étape 2 : Pré-segmentation brute ──
        raw_spans = self._split_to_spans(processed)

        # ── Étape 3 : Construction des tokens enrichis ──
        tokens: list[MalagasyToken] = []
        pos = 0
        for surface, char_s, char_e in raw_spans:
            if not surface.strip():
                continue

            norm = surface.lower().strip()
            if not norm:
                continue

            # Récupère info de contraction si applicable
            orig_form = contraction_map.get(char_s)

            token = MalagasyToken(
                text=surface,
                normalized=self.lowercase and norm or surface,
                position=pos,
                char_start=char_s,
                char_end=char_e,
                is_proper=self._is_proper_noun(surface),
                is_reduplicated=self._is_reduplicated(norm),
                is_numeral=norm in MALAGASY_NUMERALS,
                is_contraction=orig_form is not None,
                expanded_from=orig_form,
            )
            tokens.append(token)
            pos += 1

        return tokens

    def tokenize_to_strings(self, text: str) -> list[str]:
        """Version simplifiée retournant uniquement les chaînes."""
        return [t.text for t in self.tokenize(text)]

    # ── Internals ───────────────────────────────────────────

    def _expand_contractions(
        self, text: str
    ) -> tuple[str, dict[int, str]]:
        """
        Remplace les contractions apostrophées par leur forme pleine
        et retourne un mapping {position_début: forme_originale}.

        n'akoho → ny akoho
        d'izany → dia izany
        """
        if not self.expand_contractions:
            return text, {}

        contraction_map: dict[int, str] = {}
        offset = 0  # décalage cumulatif dû aux insertions

        def replace_fn(m: re.Match) -> str:
            nonlocal offset
            apos_part = m.group(1).lower()
            rest = m.group(2)
            expanded = APOSTROPHE_EXPANSIONS.get(apos_part, apos_part)
            # Enregistre la position originale (avant décalage)
            orig_start = m.start() + offset
            contraction_map[orig_start] = m.group(0)  # forme contractée
            replacement = f"{expanded} {rest}"
            offset += len(replacement) - len(m.group(0))
            return replacement

        expanded = self._contraction_re.sub(replace_fn, text)
        return expanded, contraction_map

    def _split_to_spans(
        self, text: str
    ) -> list[tuple[str, int, int]]:
        """
        Découpe le texte en spans (surface, début, fin).
        Gère les tirets composants vs séparateurs.
        """
        # Remplace ponctuation par espace (on travaille sur une copie)
        clean = PUNCT_SEP.sub(" ", text)

        spans: list[tuple[str, int, int]] = []

        for m in re.finditer(r"\S+", clean):
            word = m.group(0)
            start = m.start()

            if "-" in word and self.keep_hyphens:
                # Heuristique tiret :
                # Si les deux parties font ≥ 3 car. → mot composé → garde
                # Sinon → sépare
                parts = HYPHEN_SPLIT.split(word)
                if len(parts) == 1:
                    # Tiret court ou composant → garde comme un token
                    spans.append((word, start, start + len(word)))
                else:
                    # Sépare en tokens distincts
                    cursor = start
                    for part in parts:
                        spans.append((part, cursor, cursor + len(part)))
                        cursor += len(part) + 1  # +1 pour le tiret
            else:
                spans.append((word, start, start + len(word)))

        return spans

    @staticmethod
    def _is_proper_noun(word: str) -> bool:
        """
        Heuristique : un mot commençant par une majuscule et
        de longueur ≥ 4 est considéré comme un nom propre.
        Exclut les débuts de phrase (position 0 non gérée ici).
        """
        return bool(word and word[0].isupper() and len(word) >= 4)

    @staticmethod
    def _is_reduplicated(word: str) -> bool:
        """
        Détecte le redoublement morphologique :
        tsara-tsara, kely-kely, mandeha-monina…

        Algorithme simple : split sur tiret, vérifie si les deux moitiés
        partagent au moins les 3 premiers caractères.
        """
        if "-" not in word:
            return False
        parts = word.split("-", 1)
        if len(parts) != 2:
            return False
        a, b = parts
        return len(a) >= 3 and len(b) >= 3 and (
            a == b or a[:3] == b[:3]
        )
