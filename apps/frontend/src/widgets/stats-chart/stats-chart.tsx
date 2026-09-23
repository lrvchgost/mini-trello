import type { CardsByStatus, DashboardStats } from '@min-trello/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const STATUS_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

export interface StatusSlice {
  name: string;
  value: number;
}

/**
 * `cardsByStatus` is aggregated per column across all boards, so identically
 * named columns (e.g. "To Do" on different boards) are summed by title.
 */
export function aggregateByStatus(cardsByStatus: CardsByStatus[]): StatusSlice[] {
  const totals = new Map<string, number>();
  for (const status of cardsByStatus) {
    totals.set(status.columnTitle, (totals.get(status.columnTitle) ?? 0) + status.count);
  }
  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

export function StatsChart({ stats }: { stats: DashboardStats }) {
  const slices = aggregateByStatus(stats.cardsByStatus);
  const overdue = [
    { name: 'Просрочено', value: stats.overdueCards },
    { name: 'Без просрочки', value: Math.max(0, stats.totalCards - stats.overdueCards) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Карточки по статусам</CardTitle>
          <CardDescription>Суммарно по всем вашим доскам.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {slices.length === 0 ? (
            <p className="py-12 text-center text-sm">Пока нет карточек</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дедлайны</CardTitle>
          <CardDescription>Просроченные карточки вне колонок «Done».</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={overdue} margin={{ top: 16, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'currentColor' }} />
              <YAxis allowDecimals={false} tick={{ fill: 'currentColor' }} width={32} />
              <Tooltip cursor={{ fill: 'currentColor', opacity: 0.08 }} />
              <Bar dataKey="value" name="Карточки" radius={[6, 6, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
