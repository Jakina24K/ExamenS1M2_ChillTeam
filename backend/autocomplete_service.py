import pickle
import random
from collections import defaultdict
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "model/ngram_model.pkl"
MODEL_PATH.parent.mkdir(exist_ok=True)

def nested_defaultdict():
    return defaultdict(int)


class NGramModel:
    def __init__(self):
        self.bigram = defaultdict(nested_defaultdict)
        self.trigram = defaultdict(nested_defaultdict)

    def train(self, tokens):
        for i in range(len(tokens) - 1):
            w1, w2 = tokens[i], tokens[i + 1]
            self.bigram[w1][w2] += 1

        for i in range(len(tokens) - 2):
            w1, w2, w3 = tokens[i], tokens[i + 1], tokens[i + 2]
            self.trigram[(w1, w2)][w3] += 1

    def save(self):
        MODEL_PATH.parent.mkdir(exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self, f, protocol=pickle.HIGHEST_PROTOCOL)

    @staticmethod
    def load():
        try:
            if MODEL_PATH.exists():
                with open(MODEL_PATH, "rb") as f:
                    return pickle.load(f)
        except Exception as e:
            print("⚠️ Modèle corrompu, recréation...", e)

        return NGramModel()


def predict_next(model: NGramModel, context: list[str]):
    context = [w.lower() for w in context]

    # Try trigram first
    if len(context) >= 2:
        key = (context[-2], context[-1])
        if key in model.trigram and model.trigram[key]:
            candidates = model.trigram[key]
            return random.choices(
                list(candidates.keys()),
                weights=list(candidates.values())
            )[0]

    # Then bigram
    if len(context) >= 1:
        key = context[-1]
        if key in model.bigram and model.bigram[key]:
            candidates = model.bigram[key]
            return random.choices(
                list(candidates.keys()),
                weights=list(candidates.values())
            )[0]

    # Fallback
    if model.bigram:
        return random.choice(list(model.bigram.keys()))
    return ""