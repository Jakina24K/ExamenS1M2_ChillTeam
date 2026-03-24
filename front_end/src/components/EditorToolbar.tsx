/**
 * Editor Toolbar Component
 * Formatting controls and AI feature toggles
 */
import { type Editor } from '@tiptap/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = Editor & { chain: () => any };
import {
  Bold, Italic, Underline, Undo, Redo, SpellCheck,
  Languages, Brain, MapPin, AudioWaveform, PanelLeftClose, PanelLeft,
  Type, List, ListOrdered, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorStore, type AIFeatures } from '@/store/editorStore';

interface EditorToolbarProps {
  editor: Editor | null;
}

const aiFeatureButtons: Array<{
  key: keyof AIFeatures;
  icon: React.ElementType;
  label: string;
}> = [
  { key: 'spellcheck', icon: SpellCheck, label: 'Tsipelina (Spell Check)' },
  { key: 'autocomplete', icon: Type, label: 'Fenoy ho azy (Autocomplete)' },
  { key: 'translationHints', icon: Languages, label: 'Dikanteny (Translation)' },
  { key: 'sentimentAnalysis', icon: Brain, label: 'Fihetseham-po (Sentiment)' },
  { key: 'ner', icon: MapPin, label: 'Anarana manokana (NER)' },
  { key: 'phonotacticValidation', icon: AudioWaveform, label: 'Fonotaktika (Phonotactics)' },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { aiFeatures, toggleAIFeature, sidebarOpen, toggleSidebar } = useEditorStore();

  if (!editor) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain = () => (editor.chain() as any).focus();

  return (
    <div className="flex items-center gap-1 p-2 bg-editor-toolbar border-b border-border rounded-t-lg flex-wrap">
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().toggleBold().run()} className={editor.isActive('bold') ? 'bg-accent' : ''}><Bold className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Manamafy (Ctrl+B)</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-accent' : ''}><Italic className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mikiaka (Ctrl+I)</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().toggleUnderline().run()} className={editor.isActive('underline') ? 'bg-accent' : ''}><Underline className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Tsipika ambany (Ctrl+U)</TooltipContent></Tooltip>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-accent' : ''}><List className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Lisitra</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-accent' : ''}><ListOrdered className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Lisitra milamina</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Tsipika</TooltipContent></Tooltip>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().undo().run()}><Undo className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Averina (Ctrl+Z)</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => chain().redo().run()}><Redo className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Averina indray (Ctrl+Y)</TooltipContent></Tooltip>
      <Separator orientation="vertical" className="h-6 mx-1" />
      {aiFeatureButtons.map(({ key, icon: Icon, label }) => (
        <Tooltip key={key}><TooltipTrigger asChild><Toggle size="sm" pressed={aiFeatures[key]} onPressedChange={() => toggleAIFeature(key)} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Icon className="h-4 w-4" /></Toggle></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
      ))}
      <div className="flex-1" />
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={toggleSidebar}>{sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{sidebarOpen ? 'Afeno sidebar' : 'Asehoy sidebar'} (Ctrl+K)</TooltipContent></Tooltip>
    </div>
  );
}
