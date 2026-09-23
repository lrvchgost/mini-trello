import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './markdown-renderer';

describe('MarkdownRenderer', () => {
  it('renders markdown, including GFM extensions', () => {
    render(
      <MarkdownRenderer content={'**Жирный**\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] пункт'} />,
    );

    expect(screen.getByText('Жирный').tagName).toBe('STRONG');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does not execute raw HTML (XSS)', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<script>window.__xss = true;</script>\n\n' +
          '<img src="x" onerror="window.__xss = true" />\n\n' +
          '[ссылка](javascript:alert(1))'
        }
      />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();

    const link = container.querySelector('a');
    if (link) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    }
  });

  it('strips dangerous attributes from allowed elements', () => {
    const { container } = render(
      <MarkdownRenderer content={'<a href="https://example.com" onclick="alert(1)">ok</a>'} />,
    );

    const link = container.querySelector('a');
    if (link) {
      expect(link.getAttribute('onclick')).toBeNull();
    }
  });
});
