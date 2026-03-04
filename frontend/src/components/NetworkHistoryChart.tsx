import { useMemo } from 'react';
import { parse } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import type { NetworkHistoryEntry } from '@/types';
import { formatDifficulty } from '@/utils';

const TIMESTAMP_FORMAT = 'yyyy-MM-dd HH:mm:ss';

interface ChartPoint {
  time: number;
  timeLabel: string;
  blockHeight: number | null;
  hashrate: number | null;
  difficulty: number | null;
}

interface NetworkHistoryChartProps {
  networkHistory: NetworkHistoryEntry[];
}

function toChartPoints(history: NetworkHistoryEntry[]): ChartPoint[] {
  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return sorted.map((entry) => {
    const date = parse(entry.timestamp, TIMESTAMP_FORMAT, new Date());
    return {
      time: date.getTime(),
      timeLabel: entry.timestamp,
      blockHeight:
        typeof entry.blockHeight === 'number'
          ? entry.blockHeight
          : null,
      hashrate:
        entry.hashRate !== null && entry.hashRate !== undefined && Number.isFinite(entry.hashRate)
          ? entry.hashRate
          : null,
      difficulty:
        entry.difficulty !== null && entry.difficulty !== undefined && Number.isFinite(entry.difficulty)
          ? entry.difficulty
          : null,
    };
  });
}

export function NetworkHistoryChart({ networkHistory }: NetworkHistoryChartProps) {
  const data = useMemo(
    () => toChartPoints(networkHistory),
    [networkHistory]
  );

  return (
    <div className="w-full h-[280px]" role="img" aria-label="Hashrate and difficulty over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-level-3"
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) =>
              new Date(ts).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            }
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-level-4"
          />
          <YAxis
            yAxisId="hashrate"
            orientation="left"
            tickFormatter={(v) => `${v} TH/s`}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-level-4"
            label={{
              value: 'Hashrate (TH/s)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'currentColor', fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="difficulty"
            orientation="right"
            tickFormatter={(v) => formatDifficulty(v)}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-level-4"
            label={{
              value: 'Difficulty',
              angle: 90,
              position: 'insideRight',
              style: { fill: 'currentColor', fontSize: 12 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.95))',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.5rem',
            }}
            labelFormatter={(label: string | number, payload) => {
              const ts =
                typeof label === 'number'
                  ? new Date(label)
                  : new Date(String(label));
              const blockHeight = payload?.[0]?.payload
                ?.blockHeight as number | null | undefined;
              const blockLine =
                blockHeight !== null && blockHeight !== undefined
                  ? `\nBlock ${blockHeight.toLocaleString()}`
                  : '';
              return `${ts.toLocaleString()}${blockLine}`;
            }}
            formatter={(value, name) => {
              const num = typeof value === 'number' ? value : null;
              if (num === null || num === undefined || !Number.isFinite(num)) return ['N/A', name];
              if (name === 'Hashrate (TH/s)') return [`${num.toLocaleString()} TH/s`, name];
              if (name === 'Difficulty') return [formatDifficulty(num), name];
              return [num.toLocaleString(), name];
            }}
            labelStyle={{ color: 'inherit', whiteSpace: 'pre-line' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => value}
            iconType="line"
          />
          <Line
            yAxisId="hashrate"
            type="monotone"
            dataKey="hashrate"
            name="Hashrate (TH/s)"
            stroke="oklch(0.55 0.2 250)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="difficulty"
            type="monotone"
            dataKey="difficulty"
            name="Difficulty"
            stroke="oklch(0.75 0.15 85)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
