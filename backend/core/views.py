from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import analyze_word, autocompletion, check_word_rules, match_entities, sentiment_analyze, correction

@api_view(['POST'])
def detect_root_word_api(request):
    query_word = request.data.get('word')

    if not query_word:
        return Response({"error": "Veuillez fournir un mot"}, status=400)

    result = analyze_word(query_word)
    if result:
        return Response(result, status=200)
    
    return Response({"message": "Racine non trouvé"}, status=404) 

@api_view(['POST'])
def autocompletion_api(request):
    query_sentence = request.data.get('sentence')

    if not query_sentence:
        return Response({"error": "Veuillez fournir un mot"}, status=400)
    result = autocompletion(query_sentence)

    if result:
        return Response(result, status=200)
    
    return Response({"message": "L'autocomplétion a échoué"})

@api_view(['POST'])
def check_words_api(request):
    query_sentence = request.data.get('sentence')
    
    if not query_sentence:
        return Response({"error": "Sentence is required"}, status=400)
    
    splited_sentence = query_sentence.split()

    results = []

    for w in splited_sentence:
        valid, error = check_word_rules(w)
        results.append({
            "word": w,
            "valid": valid,
            "error": error
        })
    
    if results:
        return Response(results, status=200)
    
    return Response({"message": "Erreur lors de la vérification des mots"}, status=500)

@api_view(['POST'])
def named_entity_recognition_api(request):
    query_sentence = request.data.get('sentence')
    if not query_sentence:
        return Response({"error": "Sentence is required"}, status=400)
    
    results = match_entities(query_sentence)

    return Response({"entities" : results, "count": len(results)}, status=200)

@api_view(['POST'])
def sentence_sentiment_api(request):
    query_sentence = request.data.get('sentence')

    if not query_sentence:
        return Response({"error": "Sentence is required"}, status=400)
    
    results = sentiment_analyze(query_sentence)

    if results:
        return Response(results, status=200)
    
    return Response({"message": "Erreur lors de l'analyse de l'emotion de la phrase'"}, status=500)

@api_view(['POST'])
def correction_api(request):
    query_word = request.data.get('word')
    if not query_word:
        return Response({"error": "word is required"}, status=400)
    
    results = correction(query_word)

    if results:
        return Response(results, status=200)
    
    return Response({"message": "Erreur lors de la nomination des entités"}, status=500)