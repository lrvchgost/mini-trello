import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './markdown-editor';

vi.mock('@mdxeditor/editor', () => ({
  MDXEditor: ({
    markdown,
    onChange,
    placeholder,
  }: {
    markdown: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="mdx-editor"
      placeholder={placeholder}
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  BlockTypeSelect: () => null,
  BoldItalicUnderlineToggles: () => null,
  CreateLink: () => null,
  InsertThematicBreak: () => null,
  ListsToggle: () => null,
  UndoRedo: () => null,
  headingsPlugin: () => ({}),
  linkPlugin: () => ({}),
  listsPlugin: () => ({}),
  markdownShortcutPlugin: () => ({}),
  quotePlugin: () => ({}),
  thematicBreakPlugin: () => ({}),
  toolbarPlugin: () => ({}),
}));

function Controlled() {
  const [value, setValue] = useState('начало');
  return <MarkdownEditor value={value} onChange={setValue} />;
}

describe('MarkdownEditor', () => {
  it('reports edits through onChange', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="текст" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('mdx-editor'), { target: { value: 'новый текст' } });

    expect(onChange).toHaveBeenCalledWith('новый текст');
  });

  it('renders a sanitized live preview of the current value', () => {
    render(<Controlled />);

    fireEvent.change(screen.getByLabelText('mdx-editor'), {
      target: { value: '**жирный**' },
    });

    expect(screen.getByText('жирный').tagName).toBe('STRONG');
  });
});
