/**
 * Autocomplete Popup Component
 * Floating dropdown showing word predictions
 */
import { useCallback } from 'react';

interface AutocompletePopupProps {
  suggestions: string[];
  selectedIndex: number;
  position: { x: number; y: number } | null;
  onSelect: (word: string) => void;
  onDismiss: () => void;
}

export function AutocompletePopup({
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onDismiss,
}: AutocompletePopupProps) {
  const handleSelect = useCallback(
    (word: string) => {
      onSelect(word);
    },
    [onSelect]
  );

  if (!position || suggestions.length === 0) return null;

  return (
    <>
      {/* Backdrop to dismiss */}
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      <div
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] max-w-[240px]"
        style={{ left: position.x, top: position.y }}
      >
        {suggestions.map((word, index) => (
          <button
            key={word}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-primary text-primary-foreground'
                : 'text-popover-foreground hover:bg-accent'
            }`}
            onClick={() => handleSelect(word)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {word}
          </button>
        ))}
        <div className="px-3 py-1 text-xs text-muted-foreground border-t border-border mt-1">
          ↑↓ hisafidy · Enter hanamarina · Esc hanapaka
        </div>
      </div>
    </>
  );
}
