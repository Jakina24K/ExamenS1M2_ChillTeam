"""
Mpamaky fototeny — Analyseur morphologique du malgache
=======================================================
Stratégie hybride :
  1. Lookup direct dans l'index inversé sampateny→fototeny  (O(1))
  2. Fallback : règles de tovona/tovana + distance de Levenshtein
"""

import json
import unicodedata
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


# ─── Structures de données ────────────────────────────────────────────────────

@dataclass
class Morpheme:
    texte: str
    type: str          # "tovona" | "fototeny" | "tovana" | "tovona-mivaky"
    fonction: str      # description linguistique
    regle: Optional[str] = None  # règle phonologique appliquée

@dataclass
class Analyse:
    mot_entre: str
    fototeny: str
    morphemes: list[Morpheme]
    methode: str        # "lookup" | "regles" | "regles+distance"
    confiance: float    # 0.0 → 1.0
    distance: int = 0   # distance de Levenshtein (0 si lookup exact)


# ─── Chargement et indexation ─────────────────────────────────────────────────

def _normaliser(mot: str) -> str:
    """Normalise unicode (ñ, à, etc.) et met en minuscule."""
    return unicodedata.normalize("NFC", mot.strip().lower())


def charger_index(chemin_json: str | Path) -> tuple[dict, list]:
    """
    Retourne :
      - index_inverse : { sampateny → fototeny }
      - liste_fototeny : tous les fototeny (pour la recherche par distance)
    """
    with open(chemin_json, encoding="utf-8") as f:
        donnees = json.load(f)

    index_inverse: dict[str, str] = {}
    liste_fototeny: list[str] = []

    for entree in donnees:
        foto = _normaliser(entree["fototeny"])
        liste_fototeny.append(foto)
        # Le fototeny lui-même est aussi un sampateny (forme de base)
        index_inverse[foto] = foto
        for s in entree.get("sampateny", []):
            s_norm = _normaliser(s)
            # En cas de doublon, on garde le premier (fototeny le plus court = plus probable)
            if s_norm not in index_inverse:
                index_inverse[s_norm] = foto

    return index_inverse, liste_fototeny


# ─── Distance de Levenshtein ──────────────────────────────────────────────────

def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j-1] + 1, prev[j-1] + (ca != cb)))
        prev = curr
    return prev[-1]


def fototeny_le_plus_proche(pseudo: str, liste_fototeny: list[str], seuil: int = 3) -> tuple[str, int]:
    """Retourne (fototeny, distance) le plus proche du pseudo-fototeny."""
    meilleur, dist_min = "", 9999
    for f in liste_fototeny:
        d = levenshtein(pseudo, f)
        if d < dist_min:
            dist_min, meilleur = d, f
        if dist_min == 0:
            break
    if dist_min <= seuil:
        return meilleur, dist_min
    return "", dist_min


# ─── Règles morpho-phonologiques ──────────────────────────────────────────────
#
# Structure d'une règle :
#   pattern   : préfixe/suffixe à détecter dans le mot
#   fonction  : nom linguistique
#   strip_pre : combien de caractères enlever au début
#   strip_suf : combien de caractères enlever à la fin
#   restaurer : liste de consonnes initiales à essayer de restaurer
#               (chute phonologique à l'ajout du tovona)
#
REGLES_TOVONA = [
    # ── Préfixes actifs (man-/mam-/mang-/many-) ───────────────────────────────
    {
        "pattern": "mana", "fonction": "Tovona mivaky aktifa (man+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "man- devant voyelle : chute de t/d initial du fototeny"
    },
    {
        "pattern": "mane", "fonction": "Tovona mivaky aktifa (man+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "man- devant voyelle"
    },
    {
        "pattern": "mani", "fonction": "Tovona mivaky aktifa (man+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "man- devant voyelle"
    },
    {
        "pattern": "mano", "fonction": "Tovona mivaky aktifa (man+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "man- devant voyelle"
    },
    {
        "pattern": "manu", "fonction": "Tovona mivaky aktifa (man+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "man- devant voyelle"
    },
    {
        "pattern": "man", "fonction": "Tovona mivaky aktifa (man+consonne)",
        "strip_pre": 3, "restaurer": [""],
        "description": "man- devant consonne : pas de changement"
    },
    {
        "pattern": "mama", "fonction": "Tovona mivaky aktifa (mam+voyelle)",
        "strip_pre": 3, "restaurer": ["f", "v", ""],
        "description": "mam- devant voyelle : chute de f/v initial"
    },
    {
        "pattern": "mame", "fonction": "Tovona mivaky aktifa (mam+voyelle)",
        "strip_pre": 3, "restaurer": ["f", "v", ""],
        "description": "mam- devant voyelle"
    },
    {
        "pattern": "mami", "fonction": "Tovona mivaky aktifa (mam+voyelle)",
        "strip_pre": 3, "restaurer": ["f", "v", ""],
        "description": "mam- devant voyelle"
    },
    {
        "pattern": "mamo", "fonction": "Tovona mivaky aktifa (mam+voyelle)",
        "strip_pre": 3, "restaurer": ["f", "v", ""],
        "description": "mam- devant voyelle"
    },
    {
        "pattern": "mam", "fonction": "Tovona mivaky aktifa (mam+consonne)",
        "strip_pre": 3, "restaurer": [""],
        "description": "mam- devant consonne (b/p/m)"
    },
    {
        "pattern": "manga", "fonction": "Tovona mivaky aktifa (mang+voyelle)",
        "strip_pre": 4, "restaurer": ["k", "g", ""],
        "description": "mang- devant voyelle : chute de k/g initial"
    },
    {
        "pattern": "mange", "fonction": "Tovona mivaky aktifa (mang+voyelle)",
        "strip_pre": 4, "restaurer": ["k", "g", ""],
        "description": "mang- devant voyelle"
    },
    {
        "pattern": "mangi", "fonction": "Tovona mivaky aktifa (mang+voyelle)",
        "strip_pre": 4, "restaurer": ["k", "g", ""],
        "description": "mang- devant voyelle"
    },
    {
        "pattern": "mango", "fonction": "Tovona mivaky aktifa (mang+voyelle)",
        "strip_pre": 4, "restaurer": ["k", "g", ""],
        "description": "mang- devant voyelle"
    },
    {
        "pattern": "mang", "fonction": "Tovona mivaky aktifa (mang+consonne)",
        "strip_pre": 4, "restaurer": [""],
        "description": "mang- devant consonne"
    },
    {
        "pattern": "many", "fonction": "Tovona mivaky aktifa (many-)",
        "strip_pre": 4, "restaurer": ["dj", "j", ""],
        "description": "many- : nasalisation palatale"
    },
    # ── Préfixe intransitif mi- ────────────────────────────────────────────────
    {
        "pattern": "mi", "fonction": "Tovona mivaky (mi-)",
        "strip_pre": 2, "restaurer": [""],
        "description": "mi- : préfixe intransitif / médio-actif"
    },
    # ── Préfixes causatifs / résultatifs ──────────────────────────────────────
    {
        "pattern": "maha", "fonction": "Tovona mivaky (maha-)",
        "strip_pre": 4, "restaurer": [""],
        "description": "maha- : pouvoir faire, causer"
    },
    {
        "pattern": "mampi", "fonction": "Tovona mivaky (mampi-)",
        "strip_pre": 5, "restaurer": [""],
        "description": "mampi- : causatif indirect"
    },
    {
        "pattern": "mamp", "fonction": "Tovona mivaky (mamp-)",
        "strip_pre": 4, "restaurer": [""],
        "description": "mamp- : causatif"
    },
    {
        "pattern": "mampan", "fonction": "Tovona mivaky (mampan-)",
        "strip_pre": 6, "restaurer": [""],
        "description": "mampan- : causatif transitif"
    },
    # ── Préfixes nominaux ─────────────────────────────────────────────────────
    {
        "pattern": "fi", "fonction": "Tovona anarana (fi-)",
        "strip_pre": 2, "restaurer": [""],
        "description": "fi- : nominalisation d'action"
    },
    {
        "pattern": "fa", "fonction": "Tovona anarana (fa-)",
        "strip_pre": 2, "restaurer": [""],
        "description": "fa- : nominalisation causative"
    },
    {
        "pattern": "faha", "fonction": "Tovona anarana (faha-)",
        "strip_pre": 4, "restaurer": [""],
        "description": "faha- : état résultant, capacité"
    },
    {
        "pattern": "ha", "fonction": "Tovona anarana (ha-)",
        "strip_pre": 2, "restaurer": [""],
        "description": "ha- : nominalisation d'état"
    },
    # ── Préfixes passifs ──────────────────────────────────────────────────────
    {
        "pattern": "voa", "fonction": "Tovona iharan'asa (voa-)",
        "strip_pre": 3, "restaurer": [""],
        "description": "voa- : résultat d'une action (passif résultatif)"
    },
    {
        "pattern": "tafa", "fonction": "Tovona iharan'asa (tafa-)",
        "strip_pre": 4, "restaurer": [""],
        "description": "tafa- : action accomplie accidentellement ou spontanément"
    },
    # ── Préfixe participatif / agent ──────────────────────────────────────────
    {
        "pattern": "mpi", "fonction": "Tovona mpanao (mpi-)",
        "strip_pre": 3, "restaurer": [""],
        "description": "mpi- : celui qui fait l'action"
    },
    {
        "pattern": "mpan", "fonction": "Tovona mpanao (mpan-)",
        "strip_pre": 4, "restaurer": ["t", "d", ""],
        "description": "mpan- : agent habituel (chute t/d)"
    },
    # ── Préfixe réciproque ────────────────────────────────────────────────────
    {
        "pattern": "mifan", "fonction": "Tovona mivaky mifanatrika (mifan-)",
        "strip_pre": 5, "restaurer": ["t", "d", ""],
        "description": "mifan- : action réciproque"
    },
    {
        "pattern": "mifamp", "fonction": "Tovona mivaky mifanatrika (mifamp-)",
        "strip_pre": 6, "restaurer": [""],
        "description": "mifamp- : réciprocité avec objet indirect"
    },
    # ── Préfixes composés (ordre important : plus long d'abord) ──────────────
    {
        "pattern": "mampifan", "fonction": "Tovona mivaky mifampi (mampifan-)",
        "strip_pre": 8, "restaurer": ["t", "d", ""],
        "description": "mampifan- : causatif + réciprocité"
    },
    {
        "pattern": "mampifamp", "fonction": "Tovona mivaky mifampi (mampifamp-)",
        "strip_pre": 9, "restaurer": [""],
        "description": "mampifamp- : causatif + réciprocité indirecte"
    },
    {
        "pattern": "mifampi", "fonction": "Tovona mivaky mifampi (mifampi-)",
        "strip_pre": 7, "restaurer": [""],
        "description": "mifampi- : action récipro-causative"
    },
    # ── Préfixes nominaux fan-/fana- ──────────────────────────────────────────
    {
        "pattern": "fana", "fonction": "Tovona anarana (fan+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", ""],
        "description": "fan- devant voyelle : nominalisation active (chute t/d)"
    },
    {
        "pattern": "fan", "fonction": "Tovona anarana (fan-)",
        "strip_pre": 3, "restaurer": [""],
        "description": "fan- devant consonne : nominalisation de l'action"
    },
    # ── Préfixe ana- (passif narratif) ────────────────────────────────────────
    {
        "pattern": "ana", "fonction": "Tovona iharan'asa narratifa (an+voyelle)",
        "strip_pre": 3, "restaurer": ["t", "d", "n", ""],
        "description": "an-/ana- devant voyelle : passif narratif"
    },
    {
        "pattern": "an", "fonction": "Tovona iharan'asa narratifa (an-)",
        "strip_pre": 2, "restaurer": [""],
        "description": "an- devant consonne"
    },
    # ── man- avec voyelle épenthétique ────────────────────────────────────────
    {
        "pattern": "mana", "fonction": "Tovona mivaky aktifa avec 'a' épenthétique",
        "strip_pre": 4, "restaurer": [""],
        "description": "man-a- : voyelle de liaison devant certaines consonnes"
    },
]

REGLES_TOVANA = [
    # ── Suffixes passifs ──────────────────────────────────────────────────────
    {
        "pattern_fin": "ina", "fonction": "Tovana iharan'asa (-ina)",
        "strip_suf": 3,
        "description": "Passif d'action directe — complément d'objet direct"
    },
    {
        "pattern_fin": "ana", "fonction": "Tovana toerana/mpisitraka (-ana)",
        "strip_suf": 3,
        "description": "Passif de lieu ou de bénéficiaire"
    },
    {
        "pattern_fin": "iana", "fonction": "Tovana toerana/mpisitraka (-iana)",
        "strip_suf": 4,
        "description": "Variante de -ana après voyelle"
    },
    {
        "pattern_fin": "y", "fonction": "Tovana fitaovana (-y)",
        "strip_suf": 1,
        "description": "Passif instrumental — moyen par lequel l'action est faite"
    },
]


# ─── Moteur d'analyse ─────────────────────────────────────────────────────────

class Analyseur:
    def __init__(self, chemin_json: str | Path):
        self.index_inverse, self.liste_fototeny = charger_index(chemin_json)

    # ── Méthode 1 : lookup direct ─────────────────────────────────────────────
    def _lookup(self, mot: str) -> Optional[Analyse]:
        foto = self.index_inverse.get(mot)
        if not foto:
            return None

        morphemes = []
        if mot == foto:
            morphemes.append(Morpheme(mot, "fototeny", "Forme de base"))
        else:
            # On tente de déduire les morphèmes pour l'affichage
            morphemes = self._deduire_morphemes(mot, foto)

        return Analyse(
            mot_entre=mot,
            fototeny=foto,
            morphemes=morphemes,
            methode="lookup",
            confiance=1.0,
            distance=0,
        )

    # ── Méthode 2 : règles + distance ────────────────────────────────────────
    def _regles_et_distance(self, mot: str) -> Optional[Analyse]:
        candidats = []  # (fototeny, distance, morphemes, regle_tovona, regle_tovana)

        # Essai : préfixe seul
        for regle in REGLES_TOVONA:
            if not mot.startswith(regle["pattern"]):
                continue
            tronque = mot[regle["strip_pre"]:]
            for consonne in regle["restaurer"]:
                pseudo = consonne + tronque
                if len(pseudo) < 2:
                    continue
                foto, dist = fototeny_le_plus_proche(pseudo, self.liste_fototeny)
                if foto:
                    morph = [
                        Morpheme(regle["pattern"] + "-", "tovona", regle["fonction"],
                                 regle["description"]),
                        Morpheme(foto, "fototeny", "Fototeny",
                                 f"Restauration '{consonne}'" if consonne else None),
                    ]
                    candidats.append((foto, dist, morph))

        # Essai : suffixe seul
        for regle in REGLES_TOVANA:
            if not mot.endswith(regle["pattern_fin"]):
                continue
            pseudo = mot[: len(mot) - regle["strip_suf"]]
            if len(pseudo) < 2:
                continue
            foto, dist = fototeny_le_plus_proche(pseudo, self.liste_fototeny)
            if foto:
                morph = [
                    Morpheme(foto, "fototeny", "Fototeny"),
                    Morpheme("-" + regle["pattern_fin"], "tovana", regle["fonction"],
                             regle["description"]),
                ]
                candidats.append((foto, dist, morph))

        # Essai : préfixe + suffixe combinés
        for rp in REGLES_TOVONA:
            if not mot.startswith(rp["pattern"]):
                continue
            tronque = mot[rp["strip_pre"]:]
            for rs in REGLES_TOVANA:
                if not tronque.endswith(rs["pattern_fin"]):
                    continue
                noyau = tronque[: len(tronque) - rs["strip_suf"]]
                for consonne in rp["restaurer"]:
                    pseudo = consonne + noyau
                    if len(pseudo) < 2:
                        continue
                    foto, dist = fototeny_le_plus_proche(pseudo, self.liste_fototeny)
                    if foto:
                        morph = [
                            Morpheme(rp["pattern"] + "-", "tovona", rp["fonction"],
                                     rp["description"]),
                            Morpheme(foto, "fototeny", "Fototeny",
                                     f"Restauration '{consonne}'" if consonne else None),
                            Morpheme("-" + rs["pattern_fin"], "tovana", rs["fonction"],
                                     rs["description"]),
                        ]
                        candidats.append((foto, dist, morph))

        if not candidats:
            return None

        # Sélection du meilleur candidat (distance minimale)
        meilleur = min(candidats, key=lambda x: x[1])
        foto, dist, morphemes = meilleur

        return Analyse(
            mot_entre=mot,
            fototeny=foto,
            morphemes=morphemes,
            methode="regles+distance",
            confiance=max(0.0, 1.0 - dist * 0.15),
            distance=dist,
        )

    # ── Déduction des morphèmes pour un résultat de lookup ────────────────────
    def _deduire_morphemes(self, mot: str, foto: str) -> list[Morpheme]:
        """
        Essaie de décomposer 'mot' sachant que son fototeny est 'foto'.
        Utilise les règles + une tolérance de distance pour les cas complexes.
        """

        def tronque_correspond(tronque: str, consonne: str, foto: str, tol: int = 1) -> tuple[bool, int]:
            d = levenshtein(consonne + tronque, foto)
            return d <= tol, d

        # ── Préfixe + éventuellement suffixe ──────────────────────────────────
        # Trier les règles du pattern le plus long au plus court (greedy)
        regles_triees = sorted(REGLES_TOVONA, key=lambda r: -len(r["pattern"]))

        for regle in regles_triees:
            if not mot.startswith(regle["pattern"]):
                continue
            tronque = mot[regle["strip_pre"]:]
            # Trouve la consonne de restauration avec la distance minimale (0 = exact)
            meilleur_consonne, meilleur_dist = None, 9999
            for consonne in regle["restaurer"]:
                ok, d = tronque_correspond(tronque, consonne, foto)
                if ok and d < meilleur_dist:
                    meilleur_dist, meilleur_consonne = d, consonne
            if meilleur_consonne is None:
                continue
            consonne = meilleur_consonne

            pre_affiche = mot[: regle["strip_pre"]] + "-"
            morphemes = [Morpheme(
                pre_affiche, "tovona", regle["fonction"], regle["description"]
            )]

            regle_resto = f"Restauration de '{consonne}'" if consonne else None
            suffixe_trouve = None
            for rs in sorted(REGLES_TOVANA, key=lambda r: -len(r["pattern_fin"])):
                if mot.endswith(rs["pattern_fin"]) and len(tronque) > rs["strip_suf"]:
                    noyau = tronque[: -rs["strip_suf"]]
                    ok2, _ = tronque_correspond(noyau, consonne, foto, tol=1)
                    if ok2:
                        suffixe_trouve = rs
                        break

            morphemes.append(Morpheme(foto, "fototeny", "Fototeny", regle_resto))
            if suffixe_trouve:
                morphemes.append(Morpheme(
                    "-" + suffixe_trouve["pattern_fin"],
                    "tovana", suffixe_trouve["fonction"], suffixe_trouve["description"]
                ))
            return morphemes

        # ── Suffixe seul ──────────────────────────────────────────────────────
        for regle in sorted(REGLES_TOVANA, key=lambda r: -len(r["pattern_fin"])):
            if not mot.endswith(regle["pattern_fin"]):
                continue
            noyau = mot[: -regle["strip_suf"]]
            if levenshtein(noyau, foto) <= 2:
                return [
                    Morpheme(foto, "fototeny", "Fototeny"),
                    Morpheme("-" + regle["pattern_fin"], "tovana",
                             regle["fonction"], regle["description"]),
                ]

        # ── Fallback : mot non décomposable → on affiche la forme entière ─────
        return [Morpheme(mot, "fototeny",
                         f"Forme dérivée de « {foto} » (décomposition non résolue)")]

    # ── Point d'entrée principal ──────────────────────────────────────────────
    def analyser(self, mot: str) -> Optional[Analyse]:
        mot = _normaliser(mot)
        if not mot:
            return None

        # Étape 1 : lookup direct
        resultat = self._lookup(mot)
        if resultat:
            return resultat

        # Étape 2 : règles + distance
        return self._regles_et_distance(mot)


# ─── Affichage ────────────────────────────────────────────────────────────────

COULEURS = {
    "tovona":         "\033[96m",  # cyan
    "fototeny":       "\033[92m",  # vert
    "tovana":         "\033[93m",  # jaune
    "tovona-mivaky":  "\033[95m",  # magenta
}
RESET = "\033[0m"
GRAS  = "\033[1m"


def afficher(analyse: Analyse, couleurs: bool = True) -> str:
    lignes = []
    c = COULEURS if couleurs else {k: "" for k in COULEURS}

    lignes.append(f"\n{GRAS}Mot analysé : {analyse.mot_entre}{RESET}")
    lignes.append(f"Fototeny    : {GRAS}{analyse.fototeny}{RESET}")
    confiance_str = f"{analyse.confiance:.0%}"
    methode_str = analyse.methode
    if analyse.distance > 0:
        methode_str += f"  (distance={analyse.distance})"
    lignes.append(f"Méthode     : {methode_str}   Confiance : {confiance_str}")
    lignes.append("─" * 60)
    lignes.append("Décomposition :")

    for m in analyse.morphemes:
        col = c.get(m.type, "")
        ligne = f"  {col}{GRAS}{m.texte:<18}{RESET}  {m.type:<16}  {m.fonction}"
        if m.regle:
            ligne += f"\n{'':>36}↳ {m.regle}"
        lignes.append(ligne)

    return "\n".join(lignes)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    import argparse, sys

    parser = argparse.ArgumentParser(
        description="Mpamaky fototeny — Analyseur morphologique du malgache"
    )
    parser.add_argument("mots", nargs="*", help="Mot(s) à analyser")
    parser.add_argument("--json", default="fototeny.json", help="Chemin vers le fichier JSON")
    parser.add_argument("--no-color", action="store_true", help="Désactiver les couleurs ANSI")
    parser.add_argument("--interactif", "-i", action="store_true", help="Mode interactif (REPL)")
    args = parser.parse_args()

    print("Chargement du dictionnaire...", end="", flush=True)
    analyseur = Analyseur(args.json)
    print(f" {len(analyseur.index_inverse):,} formes indexées.\n")

    couleurs = not args.no_color and sys.stdout.isatty()

    def traiter(mot):
        res = analyseur.analyser(mot)
        if res:
            print(afficher(res, couleurs))
        else:
            print(f"\nAucune analyse trouvée pour « {mot} ».")

    if args.interactif or not args.mots:
        print("Mode interactif — tapez un mot malgache (ou 'q' pour quitter).")
        while True:
            try:
                mot = input("\n> ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if mot.lower() in ("q", "quit", "exit"):
                break
            if mot:
                traiter(mot)
    else:
        for mot in args.mots:
            traiter(mot)

from pathlib import Path  # (already imported above; shown here to indicate usage)

def _default_lexicon_path() -> Path:
    # par défaut : fichier à côté du module
    return Path(__file__).parent / "fototeny.json"

_default_analyseur: Analyseur | None = None

def _get_analyseur(json_path: str | Path | None = None) -> Analyseur:
    """
    Charge (et met en cache) un Analyseur à partir d'un chemin JSON.
    """
    global _default_analyseur
    path = Path(json_path) if json_path else _default_lexicon_path()
    # si aucun analyseur en cache ou chemin différent → (re)charger
    if _default_analyseur is None or getattr(_default_analyseur, "_lexicon_path", None) != str(path):
        _default_analyseur = Analyseur(path)
        setattr(_default_analyseur, "_lexicon_path", str(path))
    return _default_analyseur

def detect_word_root(word: str, json_path: str | Path | None = None) -> dict:
    """
    Wrapper API-friendly : prend un mot (str) et retourne un dict sérialisable
    avec la racine, les morphèmes, la méthode, la confiance et la distance.
    """
    if not word or not word.strip():
        return {"word": word, "found": False, "error": "empty_word"}

    analyseur = _get_analyseur(json_path)
    res = analyseur.analyser(word)
    if res is None:
        return {"word": word, "found": False}

    morphemes = [
        {"texte": m.texte, "type": m.type, "fonction": m.fonction, "regle": m.regle}
        for m in res.morphemes
    ]

    return {
        "word": res.mot_entre,
        "fototeny": res.fototeny,
        "morphemes": morphemes,
        "methode": res.methode,
        "confiance": res.confiance,
        "distance": res.distance,
        "found": True,
    }