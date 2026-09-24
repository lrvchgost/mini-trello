import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownRenderer } from './markdown-renderer';

const SAMPLE = [
  '# Заголовок',
  '',
  'Обычный **жирный** и _курсивный_ текст со [ссылкой](https://example.com).',
  '',
  '- пункт списка',
  '- ещё один пункт',
  '',
  '```ts',
  'const answer = 42;',
  '```',
  '',
  '<img src="x" onerror="alert(1)" /> — небезопасный HTML будет вырезан.',
].join('\n');

const meta = {
  title: 'UI/MarkdownRenderer',
  component: MarkdownRenderer,
  decorators: [
    (Story) => (
      <div className="w-[32rem] rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
  args: { content: SAMPLE },
} satisfies Meta<typeof MarkdownRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SanitizedHtml: Story = {
  args: {
    content: 'Текст до <script>alert("xss")</script> и <b>жирный</b> тег после.',
  },
};
