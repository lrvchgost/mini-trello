import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColumnHeader } from './column-header';

const meta = {
  title: 'Entities/ColumnHeader',
  component: ColumnHeader,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'К выполнению',
    count: 4,
    isDone: false,
  },
} satisfies Meta<typeof ColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Done: Story = {
  args: { title: 'Готово', count: 12, isDone: true },
};
