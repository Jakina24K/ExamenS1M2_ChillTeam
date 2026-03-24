/**
 * Context Menu Component for the editor
 * Shows translation, lemmatization, and NER options on right-click
 */
import { useState } from 'react';
import { Languages, BookOpen, MapPin, Copy, X } from 'lucide-react';
import { translateWord, getTranslationHint } from '@/services/translation';
import { lemmatize } from '@/services/lemmatization';
import { extractEntities, getEntityLabel } from '@/services/ner';

interface EditorContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
}

export function EditorContextMenu({
  visible,
  x,
  y,
  selectedText,
  onClose,
}: EditorContextMenuProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [lemma, setLemma] = useState<string | null>(null);
  const [entities, setEntities] = useState<string | null>(null);
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
    const result = lemmatize(selectedText);
    setLemma(`Fototeny: ${result.root}${result.prefix ? ` (+ ${result.prefix}-)` : ''}${result.suffix ? ` (+ -${result.suffix})` : ''}`);
  };

  const handleNER = () => {
    const ents = extractEntities(selectedText);
    if (ents.length > 0) {
      setEntities(ents.map((e) => `${getEntityLabel(e.type)}: ${e.word}`).join('\n'));
    } else {
      setEntities('Tsy nahitana anarana manokana');
    }
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
        >
          <BookOpen className="h-4 w-4" />
          Fototeny (Lemmatize)
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleNER}
        >
          <MapPin className="h-4 w-4" />
          Anarana manokana (NER)
        </button>

        <div className="border-t border-border" />

        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
          Adikao (Copy)
        </button>

        {/* Results display */}
        {(translation || lemma || entities) && (
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
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
              onClick={() => { setTranslation(null); setLemma(null); setEntities(null); }}
            >
              <X className="h-3 w-3" /> Fafao
            </button>
          </div>
        )}
      </div>
    </>
  );
}
