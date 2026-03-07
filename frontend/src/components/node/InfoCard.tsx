import { SectionHeader } from '@/components/SectionHeader';

export function InfoCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: unknown }[];
}) {
  return (
    <div className="card">
      <SectionHeader>{title}</SectionHeader>
      <div className="section-container">
        <dl className="space-y-1 text-sm">
          {items.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-level-4">{label}</dt>
              <dd className="truncate text-level-5" title={String(value)}>
                {value !== null && value !== undefined ? String(value) : 'N/A'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
