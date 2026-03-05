import type { SectionHeaderProps } from '@/types';
import { cn } from "@/utils";

export function SectionHeader({ children, as: Tag = 'h3', title, className = '' }: SectionHeaderProps) {
  return (
    <Tag className={cn('section-header', className)} title={title}>
      {children}
    </Tag>
  );
}
