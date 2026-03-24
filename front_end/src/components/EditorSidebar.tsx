/**
 * Editor Sidebar Component
 * Shows text stats, sentiment analysis, NER results, and AI feature panels
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/store/editorStore';
import { getTextStats } from '@/utils/textProcessing';
import { useSentimentAnalysis } from '@/hooks/useSentimentAnalysis';
import { extractEntities, getEntityLabel } from '@/services/ner';
import { validateText } from '@/services/phonotacticValidator';
import type { MisspelledWord } from '@/hooks/useSpellCheck';
import type { EditorStats } from '@/hooks/useEditorAnalytics';

interface EditorSidebarProps {
  misspelledWords: MisspelledWord[];
  editorStats: EditorStats;
}

export function EditorSidebar({ misspelledWords, editorStats }: EditorSidebarProps) {
  const { plainText, aiFeatures, sidebarOpen } = useEditorStore();

  const textStats = useMemo(() => getTextStats(plainText), [plainText]);
  const sentiment = useSentimentAnalysis(plainText, aiFeatures.sentimentAnalysis);
  const entities = useMemo(
    () => (aiFeatures.ner ? extractEntities(plainText) : []),
    [plainText, aiFeatures.ner]
  );
  const phonotacticErrors = useMemo(
    () => (aiFeatures.phonotacticValidation ? validateText(plainText) : []),
    [plainText, aiFeatures.phonotacticValidation]
  );

  if (!sidebarOpen) return null;

  const sentimentEmoji = sentiment.classification === 'positive' ? '😊' : sentiment.classification === 'negative' ? '😔' : '😐';
  const sentimentColor = sentiment.classification === 'positive' ? 'text-primary' : sentiment.classification === 'negative' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <ScrollArea className="w-72 border-l border-border bg-card p-4 space-y-4">
      {/* Text Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📊 Statistika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Teny</span>
            <span className="font-mono">{textStats.words}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Litera</span>
            <span className="font-mono">{textStats.charactersNoSpaces}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fehezanteny</span>
            <span className="font-mono">{textStats.sentences}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vaninteny</span>
            <span className="font-mono">{textStats.syllables}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fotoana amaky</span>
            <span className="font-mono text-xs">{textStats.readingTime}</span>
          </div>
        </CardContent>
      </Card>

      {/* Spell Check Results */}
      {aiFeatures.spellcheck && misspelledWords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              ✏️ Tsipelina ({misspelledWords.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {misspelledWords.slice(0, 10).map((w, i) => (
              <div key={`${w.word}-${i}`} className="text-sm">
                <span className="text-destructive font-medium">{w.word}</span>
                {w.suggestions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {w.suggestions.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {aiFeatures.sentimentAnalysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">🧠 Fihetseham-po</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{sentimentEmoji}</span>
              <div>
                <span className={`font-medium capitalize ${sentimentColor}`}>
                  {sentiment.classification}
                </span>
                <span className="text-muted-foreground text-xs ml-2">
                  ({(sentiment.score * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            {sentiment.positiveWords.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {sentiment.positiveWords.map((w) => (
                  <Badge key={w} className="bg-primary/20 text-primary text-xs">{w}</Badge>
                ))}
              </div>
            )}
            {sentiment.negativeWords.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {sentiment.negativeWords.map((w) => (
                  <Badge key={w} variant="destructive" className="text-xs">{w}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Named Entities */}
      {aiFeatures.ner && entities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">📍 Anarana manokana ({entities.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {entities.map((e, i) => (
              <div key={`${e.word}-${i}`} className="flex items-center gap-2 text-sm">
                <span>{getEntityLabel(e.type)}</span>
                <span className="font-medium">{e.word}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phonotactic Errors */}
      {aiFeatures.phonotacticValidation && phonotacticErrors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              🔊 Fonotaktika ({phonotacticErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {phonotacticErrors.map((e, i) => (
              <div key={`${e.word}-${i}`} className="text-sm">
                <span className="text-editor-warning font-medium">{e.word}</span>
                {e.result.errors.map((err, j) => (
                  <p key={j} className="text-xs text-muted-foreground mt-0.5">
                    "{err.pattern}" → {err.suggestion}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Session Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📈 Fitsidihana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fanitsiana noraisina</span>
            <span className="font-mono">{editorStats.correctionsAccepted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Autocomplete</span>
            <span className="font-mono">{editorStats.autocompleteAccepted}</span>
          </div>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
