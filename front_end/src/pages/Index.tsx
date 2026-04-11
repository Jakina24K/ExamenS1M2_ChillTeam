/**
 * Main Editor Page - Malagasy AI Text Editor
 */
import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditorStore } from '@/store/editorStore';
import { useSpellCheck } from '@/hooks/useSpellCheck';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEditorAnalytics } from '@/hooks/useEditorAnalytics';
import { MalagasyDictionary } from '@/services/dictionary';
import { SpellCheckExtension, type SpellCheckWord, updateSpellCheckDecorations } from '@/extensions/SpellCheckExtension';
import { AutocompleteExtension, updateAutocompleteSuggestions } from '@/extensions/AutocompleteExtension';
import { ContextMenuExtension, type ContextMenuState } from '@/extensions/ContextMenuExtension';
import { EditorToolbar } from '@/components/EditorToolbar';
import { EditorSidebar } from '@/components/EditorSidebar';
import { AutocompletePopup } from '@/components/AutocompletePopup';
import { EditorContextMenu } from '@/components/EditorContextMenu';

const Index = () => {
  const { setContent, setPlainText, aiFeatures, sidebarOpen, toggleSidebar } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, selectedText: '', from: 0, to: 0 });
  const [autocompleteState, setAutocompleteState] = useState<{ suggestions: string[]; selectedIndex: number; position: { x: number; y: number } | null }>({ suggestions: [], selectedIndex: 0, position: null });
  const { stats, increment } = useEditorAnalytics();

  // Initialize dictionary
  useEffect(() => {
    MalagasyDictionary.getInstance().load();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Manoratra eto... (Soraty eto ny lahatsoratrao)' }),
      SpellCheckExtension.configure({
        onWordClick: (word: SpellCheckWord, coords: { x: number; y: number }) => {
          setContextMenu({ visible: true, x: coords.x, y: coords.y, selectedText: word.word, from: word.from, to: word.to });
        },
      }),
      AutocompleteExtension.configure({
        onAccept: () => increment('autocompleteAccepted'),
        onStateChange: (state) => setAutocompleteState({ suggestions: state.suggestions, selectedIndex: state.selectedIndex, position: state.position }),
      }),
      ContextMenuExtension.configure({
        onContextMenu: (state) => setContextMenu(state),
      }),
    ],
    onUpdate: ({ editor: e }) => {
      setContent(e.getHTML());
      setPlainText(e.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-6 min-h-[400px] focus:outline-none bg-editor-bg text-foreground',
      },
    },
  });

  const plainText = editor?.getText() || '';
  const { misspelledWords, recheckNow } = useSpellCheck(plainText, aiFeatures.spellcheck);
  const autocomplete = useAutocomplete(plainText, aiFeatures.autocomplete);

  useEffect(() => {
    if (!editor) return;

    const decoratedWords: SpellCheckWord[] = misspelledWords.map((word) => ({
      word: word.word,
      from: word.position,
      to: word.position + word.word.length,
      suggestions: word.suggestions,
    }));

    updateSpellCheckDecorations(editor, decoratedWords);
  }, [editor, misspelledWords]);

  // Update autocomplete extension storage when suggestions change
  useEffect(() => {
    if (editor) {
      const ext = editor.extensionManager.extensions.find((e) => e.name === 'autocomplete');
      if (ext?.storage) {
        const storage = ext.storage as { active: boolean; suggestions: string[]; selectedIndex: number };
        updateAutocompleteSuggestions(storage, autocomplete.suggestions);
        if (autocomplete.suggestions.length > 0) {
          const coords = editor.view.coordsAtPos(editor.state.selection.from);
          setAutocompleteState({ suggestions: autocomplete.suggestions, selectedIndex: 0, position: { x: coords.left, y: coords.bottom + 4 } });
        } else {
          setAutocompleteState({ suggestions: [], selectedIndex: 0, position: null });
        }
      }
    }
  }, [autocomplete.suggestions, editor]);

  useKeyboardShortcuts({
    onBold: () => editor && (editor.chain() as any).focus().toggleBold().run(),
    onItalic: () => editor && (editor.chain() as any).focus().toggleItalic().run(),
    onUnderline: () => editor && (editor.chain() as any).focus().toggleUnderline().run(),
    onUndo: () => editor && (editor.chain() as any).focus().undo().run(),
    onRedo: () => editor && (editor.chain() as any).focus().redo().run(),
    onRunSpellCheck: recheckNow,
    onToggleSidebar: toggleSidebar,
  });

  const handleAutocompleteSelect = useCallback((word: string) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const tr = editor.state.tr.insertText(` ${word}`, from);
    editor.view.dispatch(tr);
    increment('autocompleteAccepted');
    setAutocompleteState({ suggestions: [], selectedIndex: 0, position: null });
  }, [editor, increment]);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">📝 Malagasy AI Editor</h1>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">Beta</span>
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} />

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto my-6">
            <div className="border border-border rounded-lg shadow-sm overflow-hidden bg-editor-bg">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <EditorSidebar misspelledWords={misspelledWords} editorStats={stats} />
      )}

      {/* Autocomplete Popup */}
      <AutocompletePopup
        suggestions={autocompleteState.suggestions}
        selectedIndex={autocompleteState.selectedIndex}
        position={autocompleteState.position}
        onSelect={handleAutocompleteSelect}
        onDismiss={() => setAutocompleteState({ suggestions: [], selectedIndex: 0, position: null })}
      />

      {/* Context Menu */}
      <EditorContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedText={contextMenu.selectedText}
        onClose={() => setContextMenu((s) => ({ ...s, visible: false }))}
      />
    </div>
  );
};

export default Index;
