import type { GroupedItem } from '@/types';
import { SectionHeader } from '@/components/SectionHeader';

export function GroupedInfoCard({
  title,
  leftGroup,
  rightGroup,
}: {
  title?: string;
  leftGroup: { heading?: string; items: GroupedItem[] };
  rightGroup: { heading?: string; items: GroupedItem[] };
}) {
  const renderGroup = (heading: string | undefined, items: GroupedItem[]) => (
    <div className="space-y-3">
      {heading !== undefined && heading !== null && heading !== '' ? (
        <h4 className="subsection-heading">
          {heading}
        </h4>
      ) : null}
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
  );
  return (
    <div className="card">
      <SectionHeader>{title}</SectionHeader>
      <div className="section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>{renderGroup(leftGroup.heading, leftGroup.items)}</div>
          <div>{renderGroup(rightGroup.heading, rightGroup.items)}</div>
        </div>
      </div>
    </div>
  );
}
