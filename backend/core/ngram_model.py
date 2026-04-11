from collections import defaultdict, Counter

def build_bigrams(tokens):
    model = defaultdict(Counter)

    for i in range(len(tokens)-1):
        w1 = tokens[i]
        w2 = tokens[i+1]

        model[w1][w2] += 1
    return model

def build_trigrams(tokens):
    model = defaultdict(Counter)

    for i in range(len(tokens)-2):
        w1 = tokens[i]
        w2 = tokens[i+1]
        w3 = tokens[i+2]

        model[(w1,w2)][w3] += 1

    return model
def predict_bigram(word, model, top_k=3):
    if word not in model:
        return []

    return [w for w, _ in model[word].most_common(top_k)]


def predict_trigram(w1, w2, model, top_k=3):
    key = (w1, w2)

    if key not in model:
        return []

    return [w for w, _ in model[key].most_common(top_k)]

def predict_next(text, bigram_model, trigram_model):
    words = text.lower().split()

    # priorité trigram
    if len(words) >= 2:
        result = predict_trigram(words[-2], words[-1], trigram_model)
        if result:
            return result

    # fallback bigram
    if len(words) >= 1:
        return predict_bigram(words[-1], bigram_model)

    return []