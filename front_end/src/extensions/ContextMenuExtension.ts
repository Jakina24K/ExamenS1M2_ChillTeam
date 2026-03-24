/**
 * Context Menu TipTap Extension
 * Shows right-click context menu with translation, lemmatization, and NER options
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  from: number;
  to: number;
}

export interface ContextMenuExtensionOptions {
  /** Callback when context menu should appear */
  onContextMenu?: (state: ContextMenuState) => void;
}

const contextMenuPluginKey = new PluginKey('contextMenu');

export const ContextMenuExtension = Extension.create<ContextMenuExtensionOptions>({
  name: 'contextMenu',

  addOptions() {
    return {
      onContextMenu: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: contextMenuPluginKey,
        props: {
          handleDOMEvents: {
            contextmenu(view, event) {
              const { state } = view;
              const { from, to } = state.selection;

              if (from === to) {
                // No selection — try to select the word under cursor
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (!pos) return false;

                const $pos = state.doc.resolve(pos.pos);
                const start = $pos.start();
                const text = $pos.parent.textContent;
                const offset = pos.pos - start;

                // Find word boundaries
                let wordStart = offset;
                let wordEnd = offset;
                while (wordStart > 0 && /[\w'À-ÿ-]/.test(text[wordStart - 1])) wordStart--;
                while (wordEnd < text.length && /[\w'À-ÿ-]/.test(text[wordEnd])) wordEnd++;

                const selectedText = text.slice(wordStart, wordEnd);
                if (selectedText.length > 0) {
                  event.preventDefault();
                  extension.options.onContextMenu?.({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    selectedText,
                    from: start + wordStart,
                    to: start + wordEnd,
                  });
                  return true;
                }
                return false;
              }

              // Has selection
              const selectedText = state.doc.textBetween(from, to);
              if (selectedText.trim()) {
                event.preventDefault();
                extension.options.onContextMenu?.({
                  visible: true,
                  x: event.clientX,
                  y: event.clientY,
                  selectedText: selectedText.trim(),
                  from,
                  to,
                });
                return true;
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
