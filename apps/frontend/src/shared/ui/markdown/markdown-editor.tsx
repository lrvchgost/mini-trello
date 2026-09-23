import { useMemo } from 'react';
import '@mdxeditor/editor/style.css';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import { Label } from '@/shared/ui/label';
import { MarkdownRenderer } from './markdown-renderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Markdown editor (MDXEditor) with a live sanitized preview underneath.
 * Raw HTML is not editable/rendered, matching ADR-003.
 */
export function MarkdownEditor({
  value,
  onChange,
  label = 'Описание',
  placeholder,
}: MarkdownEditorProps) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <BoldItalicUnderlineToggles />
            <BlockTypeSelect />
            <ListsToggle />
            <CreateLink />
            <InsertThematicBreak />
          </>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-lg border" data-slot="markdown-editor">
        <MDXEditor
          markdown={value}
          onChange={onChange}
          plugins={plugins}
          placeholder={placeholder}
        />
      </div>
      {value.trim() ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <MarkdownRenderer content={value} />
        </div>
      ) : null}
    </div>
  );
}
