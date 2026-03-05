import { cn } from "@/utils";

type SectionHeaderProps = {
  children: React.ReactNode;
  as?: 'h2' | 'h3';
  title?: string;
  className?: string;
};

export function SectionHeader({ children, as: Tag = 'h3', title, className = '' }: SectionHeaderProps) {
  return (
    <Tag className={cn('section-header', className)} title={title}>
      {children}
    </Tag>
  );
}
