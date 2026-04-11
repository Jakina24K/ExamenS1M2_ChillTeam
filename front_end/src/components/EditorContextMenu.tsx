/**
 * Context Menu Component for the editor
 * Shows translation, lemmatization, and NER options on right-click
 */
import { useState } from 'react';
import { Languages, BookOpen, MapPin, Copy, X, Wand2 } from 'lucide-react';
import { translateWord, getTranslationHint } from '@/services/translation';
import { apiClient } from '@/services/api';
import { getEntityLabel } from '@/services/ner';

interface EditorContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  onReplaceText: (replacement: string) => void;
  onClose: () => void;
}

export function EditorContextMenu({
  visible,
  x,
  y,
  selectedText,
  onReplaceText,
  onClose,
}: EditorContextMenuProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [lemma, setLemma] = useState<string | null>(null);
  const [entities, setEntities] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  if (!visible) return null;

  const handleTranslate = async () => {
    setLoading('translate');
    const hint = getTranslationHint(selectedText);
    if (hint) {
      setTranslation(hint);
    } else {
      const result = await translateWord(selectedText, 'fr');
      setTranslation(`🇫🇷 ${result.translation}`);
    }
    setLoading(null);
  };

  const handleLemmatize = () => {
    setLoading('lemma');
    apiClient
      .detectRootWord(selectedText)
      .then((result) => {
        setLemma(
          `Fototeny: ${result.fototeny}${result.tovona ? ` (+ ${result.tovona}-)` : ''}${result.tovana ? ` (+ -${result.tovana})` : ''}`,
        );
      })
      .catch(() => {
        setLemma('Tsy hita ny fototeny');
      })
      .finally(() => {
        setLoading(null);
      });
  };

  const handleNER = () => {
    setLoading('ner');
    apiClient
      .ner(selectedText)
      .then((ents) => {
        if (ents.length > 0) {
          setEntities(ents.map((e) => `${getEntityLabel(e.type)}: ${e.word}`).join('\n'));
        } else {
          setEntities('Tsy nahitana anarana manokana');
        }
      })
      .catch(() => {
        setEntities('Tsy nahitana anarana manokana');
      })
      .finally(() => {
        setLoading(null);
      });
  };

  const handleCorrection = () => {
    setLoading('correction');
    apiClient
      .correction(selectedText)
      .then((result) => {
        if (Array.isArray(result)) {
          setCorrections(result);
        } else if (typeof result === 'string' && result !== 'Le mot est correct') {
          setCorrections([result]);
        } else {
          setCorrections([]);
        }
      })
      .catch(() => {
        setCorrections([]);
      })
      .finally(() => {
        setLoading(null);
      });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px]"
        style={{ left: x, top: y }}
      >
        <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b border-border">
          "{selectedText.length > 20 ? selectedText.slice(0, 20) + '…' : selectedText}"
        </div>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleTranslate}
          disabled={loading === 'translate'}
        >
          <Languages className="h-4 w-4" />
          {loading === 'translate' ? 'Manadika...' : 'Adikao (Translate)'}
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleLemmatize}
          disabled={loading === 'lemma'}
        >
          <BookOpen className="h-4 w-4" />
          {loading === 'lemma' ? 'Mitady fototeny...' : 'Fototeny (Lemmatize)'}
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleNER}
          disabled={loading === 'ner'}
        >
          <MapPin className="h-4 w-4" />
          {loading === 'ner' ? 'Mitady NER...' : 'Anarana manokana (NER)'}
        </button>

        <div className="border-t border-border" />

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleCorrection}
          disabled={loading === 'correction'}
        >
          <Wand2 className="h-4 w-4" />
          {loading === 'correction' ? 'Mitady fanitsiana...' : 'Fanitsiana (Correction)'}
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
          Adikao (Copy)
        </button>

        {/* Results display */}
        {(translation || lemma || entities || corrections.length > 0) && (
          <div className="border-t border-border px-3 py-2 space-y-1">
            {translation && (
              <p className="text-sm text-primary">{translation}</p>
            )}
            {lemma && (
              <p className="text-sm text-accent-foreground">{lemma}</p>
            )}
            {entities && (
              <p className="text-sm text-accent-foreground whitespace-pre-line">{entities}</p>
            )}
            {corrections.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {corrections.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-md bg-accent px-2 py-1 text-xs hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      onReplaceText(suggestion);
                      onClose();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
              onClick={() => {
                setTranslation(null);
                setLemma(null);
                setEntities(null);
                setCorrections([]);
              }}
            >
              <X className="h-3 w-3" /> Fafao
            </button>
          </div>
        )}
      </div>
    </>
  );
}
