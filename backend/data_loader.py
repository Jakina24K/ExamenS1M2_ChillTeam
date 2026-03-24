# ============================================================
#  NLPM2 – Chargeur de données
#  data_loader.py
# ============================================================
#
#  Responsabilités :
#  ├── LexiconLoader   : charge lexicon.json + sentiment_lexicon.json
#  ├── CorpusLoader    : charge corpus_seed.json
#  └── WikipediaMgLoader : scrape le dump Wikipedia Malagasy
#       (via l'API MediaWiki ou le dump XML compressé)
#
# ============================================================

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger("nlpm2.data_loader")

# Répertoire des fichiers de données (relatif à ce fichier)
DATA_DIR = Path(__file__).parent / "data"

# ── Constantes Wikipedia ──────────────────────────────────────
WIKIPEDIA_MG_API = "https://mg.wikipedia.org/w/api.php"
WIKIPEDIA_DEFAULT_PAGES = [
    "Malagasy",
    "Madagasikara",
    "Fiteny_malagasy",
    "Tantara_malagasy",
    "Kolontsaina_malagasy",
    "Fanabeazana_eto_Madagasikara",
    "Toe-karena_eto_Madagasikara",
]

# ════════════════════════════════════════════════════════════
#  1. LexiconLoader
# ════════════════════════════════════════════════════════════

class LexiconLoader:
    """
    Charge les lexiques depuis des fichiers JSON.

    Schéma attendu pour lexicon.json :
        { "roots": { "mot": { "pos": ..., "gloss": ..., "freq": ... } } }

    Schéma attendu pour sentiment_lexicon.json :
        { "lexicon": { "mot": score_int } }
    """

    @staticmethod
    def load_reference_lexicon(
        path: Path | None = None,
    ) -> set[str]:
        """
        Charge le lexique de référence (set de racines connues).

        Returns:
            set[str] des mots connus.
        """
        target = path or (DATA_DIR / "lexicon.json")
        if not target.exists():
            logger.warning("Lexique introuvable : %s — utilisation du stub.", target)
            return _FALLBACK_LEXICON.copy()

        try:
            with target.open(encoding="utf-8") as f:
                data = json.load(f)
            roots = set(data.get("roots", {}).keys())
            logger.info("Lexique chargé : %d entrées depuis %s", len(roots), target)
            return roots
        except (json.JSONDecodeError, KeyError) as exc:
            logger.error("Erreur lecture lexique : %s", exc)
            return _FALLBACK_LEXICON.copy()

    @staticmethod
    def load_sentiment_lexicon(
        path: Path | None = None,
    ) -> dict[str, int]:
        """
        Charge le dictionnaire de polarité sentimentale.

        Returns:
            dict[str, int] — { mot: score }
        """
        target = path or (DATA_DIR / "sentiment_lexicon.json")
        if not target.exists():
            logger.warning("Sentiment lexique introuvable : %s", target)
            return _FALLBACK_SENTIMENT.copy()

        try:
            with target.open(encoding="utf-8") as f:
                data = json.load(f)
            lexicon = {k: int(v) for k, v in data.get("lexicon", {}).items()}
            logger.info(
                "Sentiment lexique chargé : %d entrées depuis %s",
                len(lexicon), target,
            )
            return lexicon
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.error("Erreur lecture sentiment lexique : %s", exc)
            return _FALLBACK_SENTIMENT.copy()

    @staticmethod
    def load_full_lexicon_meta(
        path: Path | None = None,
    ) -> dict[str, dict]:
        """
        Charge les métadonnées complètes du lexique (POS, gloss, freq).

        Returns:
            dict[str, dict] — { mot: { pos, gloss, freq } }
        """
        target = path or (DATA_DIR / "lexicon.json")
        if not target.exists():
            return {}
        try:
            with target.open(encoding="utf-8") as f:
                return json.load(f).get("roots", {})
        except Exception:
            return {}


# ════════════════════════════════════════════════════════════
#  2. CorpusLoader
# ════════════════════════════════════════════════════════════

class CorpusLoader:
    """
    Charge et gère le corpus de phrases pour le modèle N-gram.
    """

    @staticmethod
    def load_seed_corpus(path: Path | None = None) -> list[str]:
        """
        Charge le corpus d'amorçage depuis corpus_seed.json.

        Returns:
            list[str] des phrases.
        """
        target = path or (DATA_DIR / "corpus_seed.json")
        if not target.exists():
            logger.warning("Corpus seed introuvable : %s", target)
            return _FALLBACK_CORPUS.copy()

        try:
            with target.open(encoding="utf-8") as f:
                data = json.load(f)
            sentences = data.get("sentences", [])
            logger.info(
                "Corpus seed chargé : %d phrases depuis %s",
                len(sentences), target,
            )
            return sentences
        except (json.JSONDecodeError, KeyError) as exc:
            logger.error("Erreur lecture corpus : %s", exc)
            return _FALLBACK_CORPUS.copy()

    @staticmethod
    def save_corpus(sentences: list[str], path: Path | None = None) -> bool:
        """Sauvegarde un corpus enrichi dans corpus_seed.json."""
        target = path or (DATA_DIR / "corpus_seed.json")
        try:
            existing: list[str] = []
            if target.exists():
                with target.open(encoding="utf-8") as f:
                    existing = json.load(f).get("sentences", [])

            merged = list(dict.fromkeys(existing + sentences))  # déduplique
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("w", encoding="utf-8") as f:
                json.dump(
                    {
                        "_meta": {"total": len(merged), "updated": time.strftime("%Y-%m-%d")},
                        "sentences": merged,
                    },
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
            logger.info("Corpus sauvegardé : %d phrases → %s", len(merged), target)
            return True
        except Exception as exc:
            logger.error("Erreur sauvegarde corpus : %s", exc)
            return False


# ════════════════════════════════════════════════════════════
#  3. WikipediaMgLoader
# ════════════════════════════════════════════════════════════

class WikipediaMgLoader:
    """
    Récupère du texte depuis Wikipedia Malagasy via l'API MediaWiki.

    Utilise httpx en mode async pour ne pas bloquer l'event loop.
    Les phrases extraites sont nettoyées et retournées pour enrichir
    le corpus N-gram.

    Usage :
        loader = WikipediaMgLoader()
        sentences = await loader.fetch_sentences(
            pages=["Fiteny_malagasy", "Madagasikara"],
            max_sentences=500,
        )
    """

    def __init__(
        self,
        api_url: str = WIKIPEDIA_MG_API,
        timeout: float = 10.0,
    ) -> None:
        self.api_url = api_url
        self.timeout = timeout

    async def fetch_sentences(
        self,
        pages: list[str] | None = None,
        max_sentences: int = 1000,
    ) -> list[str]:
        """
        Récupère et nettoie les phrases depuis Wikipedia Malagasy.

        Args:
            pages: liste de titres de pages (None → pages par défaut).
            max_sentences: limite totale de phrases extraites.

        Returns:
            list[str] de phrases nettoyées.
        """
        try:
            import httpx
        except ImportError:
            logger.error(
                "httpx non installé. Exécuter : pip install httpx"
            )
            return []

        targets = pages or WIKIPEDIA_DEFAULT_PAGES
        all_sentences: list[str] = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            tasks = [
                self._fetch_page(client, title)
                for title in targets
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for title, result in zip(targets, results):
            if isinstance(result, Exception):
                logger.warning("Échec fetch Wikipedia '%s' : %s", title, result)
                continue
            sentences = self._extract_sentences(result)
            logger.info(
                "Wikipedia '%s' → %d phrases extraites", title, len(sentences)
            )
            all_sentences.extend(sentences)
            if len(all_sentences) >= max_sentences:
                break

        unique = list(dict.fromkeys(all_sentences))[:max_sentences]
        logger.info("Wikipedia Malagasy : %d phrases uniques récupérées", len(unique))
        return unique

    async def _fetch_page(self, client: Any, title: str) -> str:
        """Appel API MediaWiki pour récupérer le texte brut d'une page."""
        params = {
            "action":      "query",
            "format":      "json",
            "titles":      title,
            "prop":        "extracts",
            "explaintext": True,  # texte brut sans HTML
            "exsectionformat": "plain",
        }
        resp = await client.get(self.api_url, params=params)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        # L'API retourne une seule page avec un id quelconque
        page = next(iter(pages.values()), {})
        return page.get("extract", "")

    @staticmethod
    def _extract_sentences(text: str) -> list[str]:
        """
        Extrait des phrases valides du texte Wikipedia brut.

        Règles de filtrage :
        - Longueur : 4–150 mots
        - Pas de lignes de section (== Titre ==)
        - Pas de lignes avec des balises wiki residuelles
        - Normalisation des espaces
        """
        if not text:
            return []

        # Supprime les titres de section == ... ==
        text = re.sub(r"={2,}[^=]+=+\n?", "", text)
        # Supprime les balises résiduelles
        text = re.sub(r"\{\{[^}]*\}\}", "", text)
        text = re.sub(r"\[\[[^\]]*\]\]", lambda m: m.group(0).split("|")[-1].strip("[]"), text)
        # Normalise les espaces
        text = re.sub(r"[ \t]+", " ", text)

        sentences: list[str] = []
        # Découpe sur ponctuations finales ou retours à la ligne
        for raw in re.split(r"[.!?\n]+", text):
            sent = raw.strip()
            if not sent:
                continue
            words = sent.split()
            # Filtre longueur
            if not (4 <= len(words) <= 150):
                continue
            # Filtre : au moins 60 % de caractères alphabétiques
            alpha_ratio = sum(c.isalpha() for c in sent) / max(len(sent), 1)
            if alpha_ratio < 0.6:
                continue
            sentences.append(sent.lower())

        return sentences


# ════════════════════════════════════════════════════════════
#  4. Fallbacks (si les fichiers JSON n'existent pas encore)
# ════════════════════════════════════════════════════════════

_FALLBACK_LEXICON: set[str] = {
    "vaky", "tosika", "anatra", "fidy", "teny", "trano",
    "vola", "lasa", "tonga", "any", "aty", "izao", "izany",
    "soa", "ratsy", "tsara", "mahafinaritra", "malahelo",
    "sosotra", "falifaly", "faly", "manana", "mandeha",
    "miasa", "mianatra", "marary", "sitrana", "mahery",
    "kely", "betsaka", "foana", "ihany", "ary", "fa",
    "ny", "sy", "nefa", "saingy", "ka", "dia", "no",
    "inona", "aiza", "rahoviana", "maninona", "iza",
    "vaovao", "ataonao", "io", "ity", "toratra", "foroka",
    "ditra", "boly", "asa", "olona", "rano", "hazo",
    "akoho", "sakafo", "izy", "isika", "ianao", "ao", "amin",
}

_FALLBACK_SENTIMENT: dict[str, int] = {
    "tsara": 2, "mahafinaritra": 2, "faly": 1, "falifaly": 2,
    "soa": 1, "mahery": 1, "sitrana": 1, "fifaliana": 2,
    "ratsy": -1, "malahelo": -2, "sosotra": -1, "marary": -1,
    "very": -1, "olana": -1, "tahotra": -1, "alahelo": -2,
    "tsy": -1, "kivy": -2,
}

_FALLBACK_CORPUS: list[str] = [
    "inona ny vaovao",
    "ny teny malagasy dia manan-tantara",
    "ny fiainana dia soa",
    "mianatra ny teny malagasy",
    "tsara ny miara miasa",
    "ny ankizy dia mianatra eny am-pianarana",
]
