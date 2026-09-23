import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders Markdown without raw HTML: `rehype-raw` is intentionally not used and
 * `rehype-sanitize` strips anything unsafe, so embedded HTML cannot execute.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div data-slot="markdown" className={cn('markdown-body text-sm', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
