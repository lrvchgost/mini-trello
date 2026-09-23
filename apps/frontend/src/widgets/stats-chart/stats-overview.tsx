import type { ReactNode } from 'react';
import { AlertTriangleIcon, LayoutGridIcon, ListChecksIcon } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Loading } from '@/shared/ui/loading';
import { StatsChart } from './stats-chart';
import { useDashboardStats } from './use-dashboard-stats';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-5">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsOverview() {
  const { data, isPending, isError } = useDashboardStats();

  if (isPending) {
    return <Loading label="Загружаем статистику…" />;
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Не удалось загрузить статистику.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Досок" value={data.totalBoards} icon={<LayoutGridIcon />} />
        <StatCard label="Карточек" value={data.totalCards} icon={<ListChecksIcon />} />
        <StatCard label="Просрочено" value={data.overdueCards} icon={<AlertTriangleIcon />} />
      </div>
      <StatsChart stats={data} />
    </div>
  );
}
