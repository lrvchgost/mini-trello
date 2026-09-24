import type { Meta, StoryObj } from '@storybook/react-vite';
import { Loading } from './loading';

const meta = {
  title: 'UI/Loading',
  component: Loading,
  args: { label: 'Загрузка…' },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: { label: 'Загружаем статистику…' },
};
