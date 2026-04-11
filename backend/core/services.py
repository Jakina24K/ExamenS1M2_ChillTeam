import os
import json
from django.conf import settings
from .corpus import prepare_corpus
from .ngram_model import build_bigrams, build_trigrams, predict_bigram, predict_trigram, predict_next
import re
from difflib import get_close_matches

def analyze_word(query_word):
    query_word = query_word.lower()

    fototeny_file_path = os.path.join(settings.BASE_DIR, 'assets', 'fototeny.json')
    tovona_file_path = os.path.join(settings.BASE_DIR, 'assets', 'tovona.json')
    tovana_file_path = os.path.join(settings.BASE_DIR, 'assets', 'tovana.json')

    with open(fototeny_file_path, 'r', encoding='utf-8') as f:
        fototenyData = json.load(f)
    
    with open(tovona_file_path, 'r', encoding='utf-8') as f:
        tovonaData = json.load(f)
    
    with open(tovana_file_path, 'r', encoding='utf-8') as f:
        tovanaData = json.load(f)
    
    tovona_reversed = sorted(tovonaData, key=len, reverse=True)
    tovana_reversed = sorted(tovanaData, key=len, reverse=True)

    tovona = ''
    tovana = ''

    for t in tovona_reversed:
        if query_word.startswith(t):
            tovona = t
            break
    for t in tovana_reversed:
        if query_word.endswith(t):
            tovana = t
            break
    
    for entry in fototenyData:
        if query_word in entry.get('sampateny', []):
            return {
                'fototeny' : entry['fototeny'],
                'tovona': tovona,
                'tovana': tovana,
                'sampanteny' : query_word
            } 
    return None

def autocompletion(text):
    tokens = prepare_corpus("assets/baiboly_text.txt")

    bigram_model = build_bigrams(tokens)
    trigram_model = build_trigrams(tokens)

    return predict_next(text, bigram_model, trigram_model)

def check_word_rules(word):
    INVALID_PATTERNS = [
        r'^nb',
        r'^mk',
        r'^nk',
        r'dt',
        r'bp',
        r'sz',
    ]

    for pattern in INVALID_PATTERNS:
        if re.search(pattern, word):
            return False, f"Combinaison interdite: {pattern}"

    return True, None

def match_entities(sentence):
    cities_file_path = os.path.join(settings.BASE_DIR, 'assets', 'cities_in_madagascar.json')
    regions_file_path = os.path.join(settings.BASE_DIR, 'assets', 'regions_in_madagascar.json')
    provinces_file_path = os.path.join(settings.BASE_DIR, 'assets', 'provinces_in_madagascar.json')
    names_file_path = os.path.join(settings.BASE_DIR, 'assets', 'names_in_madagascar.json')

    with open(names_file_path, "r", encoding="utf-8") as f:
        names = json.load(f)

    with open(cities_file_path, "r", encoding="utf-8") as f:
        cities = json.load(f)

    with open(provinces_file_path, 'r', encoding="utf-8") as f:
        provinces = json.load(f)

    with open(regions_file_path, 'r', encoding="utf-8") as f:
        regions = json.load(f)

    names_lower = [n.lower() for n in names]
    provinces_lower = [p.lower() for p in provinces]
    cities_lower = [c.lower() for c in cities]
    regions_lower = [r.lower() for r in regions]

    named_entity_recognition = []

    words = sentence.split()

    for w in words:
        clean = w.strip(",.!?")

        word_lower = clean.lower()

        if word_lower in cities_lower:
            named_entity_recognition.append({
                "word": clean,
                "type": "City"
            })
        elif word_lower in provinces_lower:
            named_entity_recognition.append({
                "word": clean,
                "type": "Province"
            })
        elif word_lower in names_lower:
            named_entity_recognition.append({
                "word": clean,
                "type": "Name"
            })
        elif word_lower in regions_lower:
            named_entity_recognition.append({
                "word": clean,
                "type": "Region"
            })
    
    return named_entity_recognition

def sentiment_analyze(sentence):
    sentiment_file_path = os.path.join(settings.BASE_DIR, 'assets', 'sentiment_lexicon.json')

    with open(sentiment_file_path, "r", encoding="utf-8") as f:
        sentiment_lexicon = json.load(f)
    
    words = sentence.lower().split()
    score = 0
    i = 0

    while i < len(words):
        # gérer "tsy + mot"
        if words[i] == "tsy" and i + 1 < len(words):
            combined = f"{words[i]} {words[i+1]}"

            if combined in sentiment_lexicon:
                score += sentiment_lexicon[combined]
                i += 2
                continue

        # mot simple
        if words[i] in sentiment_lexicon:
            score += sentiment_lexicon[words[i]]

        i += 1

    return "POSITIVE" if score > 0 else "NEGATIVE" if score < 0 else "NEUTRAL"

def correction(word):
    with open("assets/unique_words.json", 'r', encoding="utf-8") as f:
        dictionary = json.load(f)

    if word in dictionary:
        return "Le mot est correct"
    else:
        return get_close_matches(word, dictionary, n=5)
