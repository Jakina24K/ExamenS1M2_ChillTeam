/**
 * Editor State Management using Zustand
 * Manages the complete state of the Malagasy AI Text Editor
 *
 * @example
 * ```tsx
 * const { content, setContent, aiFeatures } = useEditorStore();
 * ```
 */
import { create } from 'zustand';

/** Position within the editor document */
export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

/** Text selection range */
export interface SelectionRange {
  from: number;
  to: number;
  text: string;
}

/** AI feature toggle states */
export interface AIFeatures {
  spellcheck: boolean;
  autocomplete: boolean;
  grammar: boolean;
  translationHints: boolean;
  sentimentAnalysis: boolean;
  ner: boolean;
  phonotacticValidation: boolean;
}

/** Error state for API calls */
export interface APIError {
  module: string;
  message: string;
  timestamp: number;
}

interface EditorState {
  /** Current editor HTML content */
  content: string;
  /** Plain text version of the content */
  plainText: string;
  /** Current cursor position */
  cursorPosition: CursorPosition | null;
  /** Current text selection */
  selection: SelectionRange | null;
  /** AI feature toggles */
  aiFeatures: AIFeatures;
  /** Whether sidebar is open */
  sidebarOpen: boolean;
  /** Loading states per module */
  loadingStates: Record<string, boolean>;
  /** API error states */
  errors: APIError[];
  /** Document language */
  language: 'mg' | 'fr' | 'en';

  // Actions
  setContent: (content: string) => void;
  setPlainText: (text: string) => void;
  setCursorPosition: (position: CursorPosition | null) => void;
  setSelection: (selection: SelectionRange | null) => void;
  toggleAIFeature: (feature: keyof AIFeatures) => void;
  setAIFeature: (feature: keyof AIFeatures, enabled: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (module: string, loading: boolean) => void;
  addError: (module: string, message: string) => void;
  clearError: (module: string) => void;
  clearAllErrors: () => void;
  setLanguage: (lang: 'mg' | 'fr' | 'en') => void;
  reset: () => void;
}

const defaultAIFeatures: AIFeatures = {
  spellcheck: true,
  autocomplete: true,
  grammar: true,
  translationHints: false,
  sentimentAnalysis: false,
  ner: false,
  phonotacticValidation: true,
};

export const useEditorStore = create<EditorState>((set) => ({
  content: '',
  plainText: '',
  cursorPosition: null,
  selection: null,
  aiFeatures: defaultAIFeatures,
  sidebarOpen: true,
  loadingStates: {},
  errors: [],
  language: 'mg',

  setContent: (content) => set({ content }),
  setPlainText: (plainText) => set({ plainText }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setSelection: (selection) => set({ selection }),

  toggleAIFeature: (feature) =>
    set((state) => ({
      aiFeatures: {
        ...state.aiFeatures,
        [feature]: !state.aiFeatures[feature],
      },
    })),

  setAIFeature: (feature, enabled) =>
    set((state) => ({
      aiFeatures: { ...state.aiFeatures, [feature]: enabled },
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setLoading: (module, loading) =>
    set((state) => ({
      loadingStates: { ...state.loadingStates, [module]: loading },
    })),

  addError: (module, message) =>
    set((state) => ({
      errors: [...state.errors, { module, message, timestamp: Date.now() }],
    })),

  clearError: (module) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.module !== module),
    })),

  clearAllErrors: () => set({ errors: [] }),
  setLanguage: (language) => set({ language }),

  reset: () =>
    set({
      content: '',
      plainText: '',
      cursorPosition: null,
      selection: null,
      aiFeatures: defaultAIFeatures,
      sidebarOpen: true,
      loadingStates: {},
      errors: [],
      language: 'mg',
    }),
}));
