import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  DefaultTooltipContent,
  Line,
  ReferenceLine,
} from 'recharts';
import type { BtcPriceHistoryEntry, WalletTransaction } from '@/types';

const HALVING_DATES = ['2012-11-28', '2016-07-09', '2020-05-11', '2024-04-19'];

function priceAtTime(
  history: BtcPriceHistoryEntry[],
  timeMs: number
): number | null {
  if (!history.length) return null;
  const target = new Date(timeMs).toISOString().slice(0, 10);
  const exact = history.find((h) => h.date === target);
  if (exact) return exact.priceUsd;
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let prev = sorted[0];
  for (const entry of sorted) {
    if (new Date(entry.date).getTime() >= timeMs) {
      return prev.priceUsd;
    }
    prev = entry;
  }
  return prev.priceUsd;
}

export interface BtcPriceChartProps {
  priceHistory: BtcPriceHistoryEntry[];
  /** Receive transactions (already filtered by selected account when applicable). */
  receives: WalletTransaction[];
  loading?: boolean;
}

interface ChartPoint {
  time: number;
  price: number;
  isPurchase?: boolean;
  amount?: number;
  dateLabel?: string;
  priceAtTime?: number;
}

export function BtcPriceChart({
  priceHistory,
  receives,
  loading = false,
}: BtcPriceChartProps) {
  const [showHalvings, setShowHalvings] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [yScale, setYScale] = useState<'linear' | 'log'>('linear');

  const { chartData, domainY, halvingLines } = useMemo(() => {
    if (!priceHistory.length) {
      return {
        chartData: [],
        domainY: ['auto', 'auto'] as [string, string],
        halvingLines: [] as { date: string; time: number }[],
      };
    }
    const sorted = [...priceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const now = Date.now();
    const chartData: ChartPoint[] = sorted.map((e) => ({
      time: new Date(e.date).getTime(),
      price: e.priceUsd,
    }));

    const halvingLines = HALVING_DATES.map((date) => {
      const timeMs = new Date(date).getTime();
      return { date, time: timeMs };
    }).filter((h) => h.time <= now);

    const purchasePoints: ChartPoint[] = [];
    if (showPurchases && receives.length) {
      for (const tx of receives) {
        const t = tx.time;
        if (t === null || t === undefined || typeof t !== 'number') continue;
        const amount = tx.amount;
        if (amount === null || amount === undefined || typeof amount !== 'number' || amount <= 0) continue;
        const timeMs = t * 1000;
        const price = priceAtTime(priceHistory, timeMs);
        if (price === null || price === undefined) continue;
        purchasePoints.push({
          time: timeMs,
          price,
          isPurchase: true,
          amount,
          dateLabel: new Date(timeMs).toLocaleDateString(undefined, {
            dateStyle: 'medium',
          }),
          priceAtTime: price,
        });
      }
    }

    const merged: ChartPoint[] = [...chartData];
    for (const p of purchasePoints) {
      merged.push(p);
    }
    merged.sort((a, b) => a.time - b.time);

    let minY = Math.min(...merged.map((m) => m.price).filter(Number.isFinite));
    const maxY = Math.max(...merged.map((m) => m.price).filter(Number.isFinite));
    if (yScale === 'log' && minY <= 0) minY = 0.01;
    const topPadding = Number.isFinite(maxY) ? maxY * 0.12 : 0;
    const domainY: [string | number, string | number] =
      merged.length && Number.isFinite(minY) && Number.isFinite(maxY)
        ? [yScale === 'log' ? minY : 'auto', maxY + topPadding]
        : ['auto', 'auto'];

    return {
      chartData: merged,
      domainY,
      halvingLines,
    };
  }, [priceHistory, receives, showPurchases, yScale]);

  const xTicks = useMemo(() => {
    if (chartData.length < 2) return undefined;
    const minT = Math.min(...chartData.map((d) => d.time));
    const maxT = Math.max(...chartData.map((d) => d.time));
    const count = 10;
    return Array.from(
      { length: count },
      (_, i) => minT + (i / (count - 1)) * (maxT - minT)
    );
  }, [chartData]);

  const tooltipContent = useMemo(() => {
    return (
      <Tooltip
        content={(props) => {
          const { active, payload } = props;
          if (!active || !payload?.length) return null;
          if (showPurchases && !payload.some((p) => (p.payload as ChartPoint)?.isPurchase)) {
            return null;
          }
          return <DefaultTooltipContent {...props} />;
        }}
        contentStyle={{
          backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.95))',
          border: '1px solid var(--tooltip-border, #e5e7eb)',
          borderRadius: '0.5rem',
          color: 'var(--tooltip-text, #0f172a)',
        }}
        itemStyle={{ color: 'var(--tooltip-text, #0f172a)' }}
        labelStyle={{ color: 'var(--tooltip-text, #0f172a)', whiteSpace: 'pre-line' }}
        labelFormatter={(label: string | number) =>
          new Date(Number(label)).toLocaleDateString(undefined, {
            dateStyle: 'medium',
          })
        }
        formatter={(value, _name, props) => {
          const payload = props?.payload as ChartPoint | undefined;
          if (payload?.isPurchase && payload.amount !== null && payload.amount !== undefined) {
            const sats = Math.round(payload.amount * 1e8);
            const priceStr = payload.priceAtTime?.toLocaleString() ?? String(value);
            const line = `Purchase : ${payload.amount.toFixed(8)} BTC (${sats.toLocaleString()} sats) Price: $${priceStr}`;
            return [line, 'Purchase'];
          }
          const num = typeof value === 'number' ? value : Number(value);
          return [`$${Number(num).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'BTC price'];
        }}
      />
    );
  }, [showPurchases]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] min-h-[400px] flex items-center justify-center text-level-4">
        Loading price history…
      </div>
    );
  }

  if (!priceHistory.length) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3 mb-2 min-w-[280px]">
        <span className="text-caption">Halvings:</span>
        <button
          type="button"
          onClick={() => setShowHalvings((v) => !v)}
          className={`min-w-[3rem] ${showHalvings ? 'toggle-pill-active' : 'toggle-pill'}`}
        >
          {showHalvings ? 'On' : 'Off'}
        </button>
        <span className="text-caption ml-2">Purchases:</span>
        <button
          type="button"
          onClick={() => setShowPurchases((v) => !v)}
          className={`min-w-[3rem] ${showPurchases ? 'toggle-pill-active' : 'toggle-pill'}`}
        >
          {showPurchases ? 'On' : 'Off'}
        </button>
        <span className="text-caption ml-2">Scale:</span>
        <button
          type="button"
          onClick={() => setYScale((s) => (s === 'linear' ? 'log' : 'linear'))}
          className={`min-w-[4.5rem] ${yScale === 'log' ? 'toggle-pill-active' : 'toggle-pill'}`}
        >
          {yScale === 'linear' ? 'Linear' : 'Log'}
        </button>
      </div>
      <div className="w-full h-[60vh] min-h-[400px] min-w-[1px]" role="img" aria-label="BTC price history">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 28, right: 56, left: 56, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-level-3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              ticks={xTicks}
              tickFormatter={(ts) =>
                new Date(ts).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: '2-digit',
                })
              }
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-level-4"
            />
            {/* Log scale applies only to Y (price); X (time) is always linear */}
            <YAxis
              scale={yScale}
              domain={domainY}
              tickFormatter={(v) =>
                Number.isFinite(v) ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'
              }
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-level-4"
              width={80}
              label={{
                value: 'BTC (USD)',
                angle: -90,
                position: 'left',
                style: { fill: 'currentColor', fontSize: 12 },
              }}
            />
            {tooltipContent}
            {showHalvings &&
              halvingLines.map((h, i) => (
                <ReferenceLine
                  key={h.date}
                  x={h.time}
                  stroke="var(--level-4)"
                  strokeDasharray="4 4"
                  label={{ value: `Halving ${i + 1}`, position: 'top', fontSize: 10 }}
                />
              ))}
            <Line
              type="monotone"
              dataKey="price"
              name="BTC price"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (showPurchases && payload?.isPurchase && typeof cx === 'number' && typeof cy === 'number') {
                  return (
                    <circle cx={cx} cy={cy} r={5} fill="var(--level-6)" stroke="var(--level-1)" strokeWidth={1} />
                  );
                }
                return <circle r={0} />;
              }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
