import re

def clean_text(file_path):

    with open(file_path, "r", encoding="utf-8") as f:
        text = f.readlines()

    text = str(text)
    text = text.lower()

    # gérer apostrophes malagasy
    text = text.replace("’", " ")
    text = text.replace("'", " ")

    # enlever ponctuation
    text = re.sub(r"[^\w\s]", "", text)

    return text

def remove_stop_words(tokens):
    STOPWORDS = ["ny","sy","ao","amin"]
    tokens = [t for t in tokens if t not in STOPWORDS]

    return tokens

def prepare_corpus(folder_path):
    clean = clean_text(folder_path)

    tokens_split = clean.split()

    print(tokens_split[:10])
    # tokens = remove_stop_words(tokens_split)

    return tokens_split

