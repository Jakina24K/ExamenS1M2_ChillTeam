/**
 * Autocomplete TipTap Extension
 * ProseMirror plugin that shows next-word suggestions popup
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface AutocompleteState {
  active: boolean;
  suggestions: string[];
  selectedIndex: number;
  position: { x: number; y: number } | null;
}

const autocompletePluginKey = new PluginKey('autocomplete');

export interface AutocompleteExtensionOptions {
  /** Callback to get suggestions based on current text */
  getSuggestions?: (text: string) => string[];
  /** Callback when a suggestion is accepted */
  onAccept?: (word: string) => void;
  /** Callback when suggestion state changes */
  onStateChange?: (state: AutocompleteState) => void;
}

export const AutocompleteExtension = Extension.create<AutocompleteExtensionOptions>({
  name: 'autocomplete',

  addOptions() {
    return {
      getSuggestions: undefined,
      onAccept: undefined,
      onStateChange: undefined,
    };
  },

  addStorage() {
    return {
      active: false,
      suggestions: [] as string[],
      selectedIndex: 0,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: autocompletePluginKey,

        props: {
          handleKeyDown(view, event) {
            const storage = extension.storage;

            if (!storage.active || storage.suggestions.length === 0) {
              return false;
            }

            switch (event.key) {
              case 'ArrowDown': {
                event.preventDefault();
                storage.selectedIndex = Math.min(
                  storage.selectedIndex + 1,
                  storage.suggestions.length - 1
                );
                extension.options.onStateChange?.({
                  active: true,
                  suggestions: storage.suggestions,
                  selectedIndex: storage.selectedIndex,
                  position: null,
                });
                return true;
              }

              case 'ArrowUp': {
                event.preventDefault();
                storage.selectedIndex = Math.max(storage.selectedIndex - 1, 0);
                extension.options.onStateChange?.({
                  active: true,
                  suggestions: storage.suggestions,
                  selectedIndex: storage.selectedIndex,
                  position: null,
                });
                return true;
              }

              case 'Enter':
              case 'Tab': {
                event.preventDefault();
                const word = storage.suggestions[storage.selectedIndex];
                if (word) {
                  // Insert the word at cursor
                  const { state } = view;
                  const { from } = state.selection;
                  const tr = state.tr.insertText(` ${word}`, from);
                  view.dispatch(tr);
                  extension.options.onAccept?.(word);
                }
                storage.active = false;
                storage.suggestions = [];
                storage.selectedIndex = 0;
                extension.options.onStateChange?.({
                  active: false,
                  suggestions: [],
                  selectedIndex: 0,
                  position: null,
                });
                return true;
              }

              case 'Escape': {
                event.preventDefault();
                storage.active = false;
                storage.suggestions = [];
                storage.selectedIndex = 0;
                extension.options.onStateChange?.({
                  active: false,
                  suggestions: [],
                  selectedIndex: 0,
                  position: null,
                });
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Update autocomplete suggestions externally
 */
export function updateAutocompleteSuggestions(
  extensionStorage: { active: boolean; suggestions: string[]; selectedIndex: number },
  suggestions: string[]
) {
  extensionStorage.active = suggestions.length > 0;
  extensionStorage.suggestions = suggestions;
  extensionStorage.selectedIndex = 0;
}
