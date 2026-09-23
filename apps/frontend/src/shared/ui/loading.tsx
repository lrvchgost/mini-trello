import { Loader2Icon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface LoadingProps {
  label?: string;
  className?: string;
}

export function Loading({ label = 'Загрузка…', className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground',
        className,
      )}
    >
      <Loader2Icon className="size-6 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
