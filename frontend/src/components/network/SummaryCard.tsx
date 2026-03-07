import { SectionHeader } from '@/components/SectionHeader';
import { Spinner } from '@/components/Spinner';

export function SummaryCard({
  title,
  value,
  subLines,
  compactSubLines,
  loading,
}: {
  title: string;
  value: string;
  subLines?: { label: string; value: string; progress?: number }[];
  /** Tighter vertical spacing between sublines (e.g. for fee estimates). */
  compactSubLines?: boolean;
  /** Show a small loading indicator next to the value. */
  loading?: boolean;
}) {
  return (
    <div className="section-container">
      <SectionHeader>{title}</SectionHeader>
      <p className="text-2xl font-semibold text-level-5 mb-2 flex items-center gap-2">
        {value}
        {loading && <Spinner size="sm" className="flex-shrink-0" />}
      </p>
      {subLines?.length ? (
        <div className={compactSubLines ? 'space-y-0.5 text-sm' : 'space-y-1.5 text-sm'}>
          {subLines.map(({ label, value: v, progress }) => (
            <div key={label}>
              <div className="flex justify-between gap-2 text-level-4">
                <span>{label}</span>
                <span className="text-level-5">{v}</span>
              </div>
              {progress !== undefined && (
                <div className="mt-0.5 h-1 rounded-full bg-level-3 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
