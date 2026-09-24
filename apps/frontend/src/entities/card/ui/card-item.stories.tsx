import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeCard } from '@/test/fixtures';
import { CardItem } from './card-item';

const meta = {
  title: 'Entities/CardItem',
  component: CardItem,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    card: makeCard({ title: 'Подготовить отчёт', priority: 'medium' }),
  },
} satisfies Meta<typeof CardItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const UrgentWithDeadline: Story = {
  args: {
    card: makeCard({
      title: 'Исправить продовый инцидент',
      priority: 'urgent',
      deadline: new Date('2026-12-31T00:00:00.000Z'),
    }),
  },
};

export const Overdue: Story = {
  args: {
    card: makeCard({
      title: 'Просроченная задача',
      priority: 'high',
      deadline: new Date('2020-01-01T00:00:00.000Z'),
    }),
  },
};
