import type { Meta, StoryObj } from '@storybook/react-vite';
import { InboxIcon } from 'lucide-react';
import { Button } from './button';
import { EmptyState } from './empty-state';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: {
    title: 'Пока нет досок',
    description: 'Создайте первую доску, чтобы начать работу.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIconAndAction: Story = {
  args: {
    icon: <InboxIcon />,
    action: <Button size="sm">Создать доску</Button>,
  },
};
