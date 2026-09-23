import { Link } from 'react-router-dom';
import { CompassIcon, HomeIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <CompassIcon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Страница не найдена</h1>
        <p className="text-sm text-muted-foreground">
          Возможно, ссылка устарела или страница была перемещена.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">
          <HomeIcon />
          На главную
        </Link>
      </Button>
    </div>
  );
}
