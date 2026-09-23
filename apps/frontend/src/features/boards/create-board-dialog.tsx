import { zodResolver } from '@hookform/resolvers/zod';
import { createBoardSchema, type CreateBoardInput } from '@min-trello/shared';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { ruZodErrorMap } from '@/shared/lib/zod-error-map';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { useCreateBoard } from './hooks';

export function CreateBoardDialog() {
  const [open, setOpen] = useState(false);
  const createBoard = useCreateBoard();
  const form = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema, { errorMap: ruZodErrorMap }),
    defaultValues: { title: '' },
  });

  async function onSubmit(values: CreateBoardInput) {
    form.clearErrors('root');
    try {
      await createBoard.mutateAsync(values);
      form.reset();
      setOpen(false);
    } catch (error) {
      applyServerErrors(form.setError, error);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Новая доска
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая доска</DialogTitle>
          <DialogDescription>
            Дайте доске название — колонки и карточки добавите внутри.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Например, «Работа»" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={createBoard.isPending}>
                {createBoard.isPending ? 'Создаём…' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
