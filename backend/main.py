# ============================================================
#  NLPM2 – Malagasy Augmented Text Editor · Backend
#  main.py v2 – FastAPI avec lifespan + endpoints enrichis
# ============================================================

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import malagasy_analyzer

from logic import MalagasyAnalyzer

# ── Singleton analyzer ────────────────────────────────────────
analyzer = MalagasyAnalyzer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application.

    Au DÉMARRAGE :
      1. Charge le lexique de référence depuis data/lexicon.json
      2. Charge le dictionnaire de sentiment
      3. Charge le corpus seed et construit le modèle N-gram
      (toutes les ressources JSON sont lues une seule fois)

    À L'ARRÊT :
      Nettoyage si nécessaire (log, flush, etc.)
    """
    # ── Startup ──
    analyzer.initialize(
        # Chemins explicites (None → utilise les défauts dans data_loader.py)
        lexicon_path=None,
        sentiment_path=None,
        corpus_path=None,
    )
    print("MalagasyAnalyzer initialisé et prêt.")

    yield  # ← l'application tourne pendant ce yield

    # ── Shutdown ──
    print("NLPM2 Backend arrêté proprement.")


# ── Application FastAPI ───────────────────────────────────────
app = FastAPI(
    title="NLPM2 – Malagasy NLP API",
    description=(
        "Backend NLP pour l'éditeur de texte Malagasy augmenté.\n\n"
        "Fonctionnalités : Phonotactique · Lemmatisation · Sentiment · "
        "N-gram · Suggestions Levenshtein"
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# ── CORS (React / Quill.js frontend) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://nlpm2.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════════════════════
#  Schémas Pydantic
# ════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Texte Malagasy à analyser.",
        examples=["Manosika ny teny malagasy"],
    )


class LemmaResult(BaseModel):
    token: str
    racine: str
    prefixe_retire: str | None = None
    suffixe_retire: str | None = None
    score_confiance: float = 0.0
    note: str = ""


class PhonotacticError(BaseModel):
    token: str
    position: int
    cluster_interdit: str
    type_erreur: str = "PHONOTACTIQUE"
    description: str = ""
    score_confiance: float = 1.0


class TokenMeta(BaseModel):
    text: str
    normalized: str
    position: int
    is_proper: bool = False
    is_reduplicated: bool = False
    is_numeral: bool = False
    is_contraction: bool = False
    expanded_from: str | None = None


class AnalyzeResponse(BaseModel):
    tokens: list[str]
    tokens_enrichis: list[dict] = []
    lemmas: list[dict] = []
    phonotactic_errors: list[dict] = []
    suggestions: dict[str, Any] = {}
    sentiment: dict[str, Any] = {}
    next_word_predictions: list[str] = []
    metadata: dict[str, Any] = {}


class LemmatizeRequest(BaseModel):
    word: str = Field(..., min_length=1, description="Mot à lemmatiser.")
    all_hypotheses: bool = Field(
        False, description="Si True, retourne toutes les hypothèses de racine."
    )

class DetectWordRootRequest(BaseModel) : 
    word: str = Field(..., min_length=1)

class WikiEnrichRequest(BaseModel):
    pages: list[str] | None = Field(
        None,
        description="Titres de pages Wikipedia Malagasy (None → pages par défaut).",
    )
    max_sentences: int = Field(500, ge=10, le=5000)


# ════════════════════════════════════════════════════════════
#  Routes
# ════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def health_check() -> dict:
    """Vérifie que l'API est opérationnelle."""
    return {
        "status": "ok",
        "projet": "NLPM2",
        "version": "0.2.0",
        "initialized": analyzer._initialized,
        "lexique_size": len(analyzer._reference_lexicon),
    }


@app.post("/analyze", response_model=AnalyzeResponse, tags=["NLP"])
async def analyze_text(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Pipeline NLP complet.

    Retourne :
    - `tokens`               : mots bruts
    - `tokens_enrichis`      : métadonnées (propre, redoublé, contraction…)
    - `lemmas`               : racines avec mutations consonantiques
    - `phonotactic_errors`   : clusters interdits
    - `suggestions`          : corrections Levenshtein (si RapidFuzz installé)
    - `sentiment`            : score BoW + label
    - `next_word_predictions`: N-gram bigramme avec backoff
    - `metadata`             : stats et timings
    """
    try:
        result = await analyzer.analyze(payload.text)
        return AnalyzeResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/detect_word_root", tags=["RootWord"])
async def detect_word_root(payload: DetectWordRootRequest) -> dict:
    result = malagasy_analyzer.detect_word_root(payload.word.strip())
    return result


@app.post("/validate_phonotactics", tags=["NLP"])
async def validate_phonotactics(payload: AnalyzeRequest) -> dict:
    """Valide la phonotactique d'un texte Malagasy."""
    import asyncio
    tokens = [t.text for t in analyzer._tokenizer.tokenize(payload.text)]
    errors = await asyncio.to_thread(analyzer.check_phonotactics, tokens)
    return {
        "text":   payload.text,
        "tokens": tokens,
        "errors": errors,
        "valid":  len(errors) == 0,
    }


@app.post("/enrich/wikipedia", tags=["Admin"])
async def enrich_from_wikipedia(
    payload: WikiEnrichRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Déclenche l'enrichissement du modèle N-gram depuis Wikipedia Malagasy.

    Lance la tâche en arrière-plan et retourne immédiatement un accusé.
    Le résultat est loggé côté serveur.
    """
    async def _task():
        result = await analyzer.enrich_from_wikipedia(
            pages=payload.pages,
            max_sentences=payload.max_sentences,
        )
        import logging
        logging.getLogger("nlpm2").info("Enrichissement Wikipedia : %s", result)

    background_tasks.add_task(_task)
    return {
        "status": "enqueued",
        "message": "Enrichissement Wikipedia lancé en arrière-plan.",
        "pages": payload.pages or "défaut",
    }


@app.get("/stats", tags=["Admin"])
async def get_stats() -> dict:
    """Statistiques courantes du moteur NLP."""
    ngram_count = sum(len(v) for v in analyzer._ngram_model.values())
    return {
        "lexique_entries":   len(analyzer._reference_lexicon),
        "sentiment_entries": len(analyzer._sentiment_lexicon),
        "ngram_contexts":    len(analyzer._ngram_model),
        "ngram_transitions": ngram_count,
        "ngram_order":       analyzer._order,
        "rapidfuzz":         analyzer.__class__.__module__,
        "initialized":       analyzer._initialized,
    }


# ── Dev entry-point ───────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
