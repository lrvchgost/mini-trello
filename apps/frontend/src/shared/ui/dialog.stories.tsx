import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Открыть диалог</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая доска</DialogTitle>
          <DialogDescription>Введите название доски. Изменить его можно позже.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Название доски" defaultValue="Домашние дела" />
        <DialogFooter>
          <Button variant="outline">Отмена</Button>
          <Button>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
