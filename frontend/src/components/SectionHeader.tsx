import type { SectionHeaderProps } from '@/types';
import { cn } from "@/utils";
import { ChevronDown, ChevronRight } from '@/components/Icons';

export function SectionHeader({
  children,
  as: Tag = 'h3',
  title,
  className = '',
  expandable,
  collapsed = false,
  onToggle,
}: SectionHeaderProps) {
  const headerClasses = cn('section-header', className);

  if (expandable && onToggle !== undefined) {
    return (
      <button
        type="button"
        className={cn(headerClasses, 'section-header-expandable flex items-center justify-between w-full text-left cursor-pointer')}
        title={title}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={!collapsed}
      >
        <span className="flex-1 min-w-0" role="heading" aria-level={Tag === 'h2' ? 2 : 3}>
          {children}
        </span>
        <span className="flex-shrink-0 ml-2" aria-hidden>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
    );
  }

  return (
    <Tag className={headerClasses} title={title}>
      {children}
    </Tag>
  );
}
