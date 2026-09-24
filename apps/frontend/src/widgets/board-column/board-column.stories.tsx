import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeCard, makeColumn } from '@/test/fixtures';
import { withDndContext, withQueryClient, withRouter } from '@/test/storybook';
import { BoardColumn } from './board-column';

const boardId = 'clx000000000000000000001';
const columnId = 'clx000000000000000000201';

const meta = {
  title: 'Widgets/BoardColumn',
  component: BoardColumn,
  decorators: [withQueryClient, withRouter, withDndContext],
  args: {
    column: makeColumn({
      id: columnId,
      boardId,
      title: 'К выполнению',
      cards: [
        makeCard({ id: 'card-1', columnId, title: 'Подготовить отчёт', priority: 'high' }),
        makeCard({ id: 'card-2', columnId, title: 'Согласовать макет', order: 1 }),
      ],
    }),
  },
} satisfies Meta<typeof BoardColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    column: makeColumn({ id: columnId, boardId, title: 'Готово', isDone: true, cards: [] }),
  },
};
