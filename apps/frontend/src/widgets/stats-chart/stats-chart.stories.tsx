import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DashboardStats } from '@min-trello/shared';
import { StatsChart } from './stats-chart';

const stats: DashboardStats = {
  totalBoards: 3,
  totalCards: 24,
  overdueCards: 5,
  cardsByStatus: [
    { columnId: 'clx000000000000000000201', columnTitle: 'К выполнению', count: 9 },
    { columnId: 'clx000000000000000000202', columnTitle: 'В работе', count: 6 },
    { columnId: 'clx000000000000000000203', columnTitle: 'Готово', count: 9 },
  ],
};

const meta = {
  title: 'Widgets/StatsChart',
  component: StatsChart,
  args: { stats },
} satisfies Meta<typeof StatsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    stats: { totalBoards: 0, totalCards: 0, overdueCards: 0, cardsByStatus: [] },
  },
};
