import type { ReactNode } from 'react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSectionCollapsed } from '@/hooks/useSectionCollapsed';
import { cn } from '@/utils';

interface CollapsibleSectionProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({ id, title, children, className }: CollapsibleSectionProps) {
  const [collapsed, toggle] = useSectionCollapsed(id);

  return (
    <div
      className={cn('card', className, collapsed && 'section-container-collapsed')}
      data-collapsed={collapsed}
    >
      <SectionHeader expandable collapsed={collapsed} onToggle={toggle}>
        {title}
      </SectionHeader>
      {!collapsed && <div className="section-container">{children}</div>}
    </div>
  );
}
