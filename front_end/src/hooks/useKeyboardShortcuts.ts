/**
 * Keyboard Shortcuts Hook
 * Registers global keyboard shortcuts for the editor
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onToggleSidebar: () => store.toggleSidebar(),
 *   onRunSpellCheck: () => spellCheck.recheckNow(),
 * });
 * ```
 */
import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutHandlers {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onRunSpellCheck?: () => void;
  onToggleSidebar?: () => void;
  onSave?: () => void;
}

export interface RegisteredShortcut {
  key: string;
  modifiers: string[];
  description: string;
  action: string;
}

/**
 * Hook for registering editor keyboard shortcuts
 * @param handlers - Callback functions for each shortcut
 * @param enabled - Whether shortcuts are active (default: true)
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled = true
): RegisteredShortcut[] {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const registeredShortcuts: RegisteredShortcut[] = [
    { key: 'b', modifiers: ['Ctrl/Cmd'], description: 'Manamafy (Bold)', action: 'onBold' },
    { key: 'i', modifiers: ['Ctrl/Cmd'], description: 'Mikiaka (Italic)', action: 'onItalic' },
    { key: 'u', modifiers: ['Ctrl/Cmd'], description: 'Tsipika ambany (Underline)', action: 'onUnderline' },
    { key: 'z', modifiers: ['Ctrl/Cmd'], description: 'Averina (Undo)', action: 'onUndo' },
    { key: 'y', modifiers: ['Ctrl/Cmd'], description: 'Averina indray (Redo)', action: 'onRedo' },
    { key: 's', modifiers: ['Ctrl/Cmd', 'Shift'], description: 'Hamarino tsipelina (Spell Check)', action: 'onRunSpellCheck' },
    { key: 'k', modifiers: ['Ctrl/Cmd'], description: 'Asehoy/Afeno sidebar', action: 'onToggleSidebar' },
    { key: 's', modifiers: ['Ctrl/Cmd'], description: 'Tehirizo (Save)', action: 'onSave' },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const h = handlersRef.current;

      if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        h.onRunSpellCheck?.();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          h.onBold?.();
          break;
        case 'i':
          e.preventDefault();
          h.onItalic?.();
          break;
        case 'u':
          e.preventDefault();
          h.onUnderline?.();
          break;
        case 'z':
          e.preventDefault();
          h.onUndo?.();
          break;
        case 'y':
          e.preventDefault();
          h.onRedo?.();
          break;
        case 'k':
          e.preventDefault();
          h.onToggleSidebar?.();
          break;
        case 's':
          e.preventDefault();
          h.onSave?.();
          break;
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return registeredShortcuts;
}
