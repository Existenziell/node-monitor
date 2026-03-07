import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { DistributionData } from '@/types';
import { isUnknownPoolIdentifier } from '@/utils';
import { PIE_COLORS } from '@/constants';

export function PoolDistributionChart({
  distribution,
  poolByIdentifier,
}: {
  distribution: DistributionData | null;
  poolByIdentifier: Map<string, { name: string; icon?: string }>;
}) {
  const pieData = useMemo(() => {
    if (!distribution?.by_percentage) return [];
    const sorted = Object.entries(distribution.by_percentage)
      .filter(([, pct]) => Number.isFinite(pct) && pct > 0)
      .map(([identifier, value]) => {
        const pool = poolByIdentifier.get(identifier) ?? (isUnknownPoolIdentifier(identifier) ? poolByIdentifier.get('unknown') : undefined);
        return {
          name: pool?.name ?? identifier,
          value: Number(value),
        };
      })
      .sort((a, b) => b.value - a.value);
    const top7 = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const othersValue = rest.reduce((sum, d) => sum + d.value, 0);
    if (othersValue <= 0) return top7;
    return [...top7, { name: 'Others', value: othersValue }];
  }, [distribution, poolByIdentifier]);

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-level-4 text-sm">
        No distribution data
      </div>
    );
  }

  return (
    <div className="w-full h-[240px] min-h-[240px] min-w-[1px]" role="img" aria-label="Pool distribution by block share">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={240}>
        <PieChart margin={{ top: 8, right: 140, bottom: 8, left: 8 }}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius="100%"
            paddingAngle={0}
            cornerRadius={0}
            stroke="var(--level-2)"
            strokeWidth={1}
          >
            {pieData.map((_, index) => (
              <Cell
                key={index}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
                stroke="var(--level-2)"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.95))',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.5rem',
              color: 'var(--tooltip-text, #0f172a)',
            }}
            itemStyle={{ color: 'var(--tooltip-text, #0f172a)' }}
            labelStyle={{ color: 'var(--tooltip-text, #0f172a)' }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 12, paddingLeft: 20, color: 'var(--level-5)' }}
            formatter={(value) => <span style={{ color: 'var(--level-5)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
