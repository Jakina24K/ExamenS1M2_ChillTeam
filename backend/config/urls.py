from django.contrib import admin
from django.urls import path
from core.views import detect_root_word_api, autocompletion_api, check_words_api, named_entity_recognition_api, sentence_sentiment_api, correction_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('detect_root_word/', detect_root_word_api, name='detect_root_word_api'),
    path('autocompletion/', autocompletion_api, name='autocompletion_api'),
    path('check_words/', check_words_api, name='check_words'),
    path('named_entity_recognition/', named_entity_recognition_api, name='named_entity_recognition_api'),
    path('sentence_sentiment/', sentence_sentiment_api, name='sentence_sentiment'),
    path('correction/', correction_api, name='correction'),
]
