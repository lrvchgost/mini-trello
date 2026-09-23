import { LayoutDashboardIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Доски</h1>
          <p className="text-sm text-muted-foreground">
            Каркас готов. Список досок и графики появятся на шаге 5.4.
          </p>
        </div>
        <Button disabled>
          <PlusIcon />
          Новая доска
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboardIcon className="size-4 text-muted-foreground" />
            UI-кит подключён
          </CardTitle>
          <CardDescription>
            Tailwind, shadcn/ui, тема light/dark, layout и общие состояния.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Компоненты доступны в Storybook: pnpm storybook
        </CardFooter>
      </Card>
    </div>
  );
}
