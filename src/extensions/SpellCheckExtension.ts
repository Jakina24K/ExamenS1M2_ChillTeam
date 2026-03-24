/**
 * SpellCheck TipTap Extension
 * ProseMirror plugin that adds red underline decorations to misspelled words
 * and shows correction suggestions on click
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SpellCheckWord {
  word: string;
  from: number;
  to: number;
  suggestions: string[];
}

const spellCheckPluginKey = new PluginKey('spellCheck');

export interface SpellCheckExtensionOptions {
  /** Callback when a misspelled word is clicked */
  onWordClick?: (word: SpellCheckWord, coords: { x: number; y: number }) => void;
}

export const SpellCheckExtension = Extension.create<SpellCheckExtensionOptions>({
  name: 'spellCheck',

  addOptions() {
    return {
      onWordClick: undefined,
    };
  },

  addStorage() {
    return {
      misspelledWords: [] as SpellCheckWord[],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: spellCheckPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldDecorations) {
            const meta = tr.getMeta(spellCheckPluginKey);
            if (meta?.misspelledWords) {
              const decorations: Decoration[] = [];

              for (const word of meta.misspelledWords as SpellCheckWord[]) {
                decorations.push(
                  Decoration.inline(word.from, word.to, {
                    class: 'spell-error',
                    style:
                      'text-decoration: wavy underline; text-decoration-color: hsl(var(--editor-error)); text-underline-offset: 3px; cursor: pointer;',
                    'data-word': word.word,
                    'data-suggestions': JSON.stringify(word.suggestions),
                  })
                );
              }

              return DecorationSet.create(tr.doc, decorations);
            }

            if (tr.docChanged) {
              return oldDecorations.map(tr.mapping, tr.doc);
            }

            return oldDecorations;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('spell-error')) {
              const word = target.getAttribute('data-word') || '';
              const suggestions = JSON.parse(target.getAttribute('data-suggestions') || '[]');
              const rect = target.getBoundingClientRect();

              extension.options.onWordClick?.(
                { word, from: pos, to: pos + word.length, suggestions },
                { x: rect.left, y: rect.bottom + 4 }
              );
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Update spell check decorations in the editor
 * Call this from your spell check hook when results change
 */
export function updateSpellCheckDecorations(
  editor: { view: { dispatch: (tr: unknown) => void; state: { tr: { setMeta: (key: PluginKey, value: unknown) => unknown } } } },
  misspelledWords: SpellCheckWord[]
) {
  const tr = editor.view.state.tr.setMeta(spellCheckPluginKey, { misspelledWords });
  editor.view.dispatch(tr);
}
