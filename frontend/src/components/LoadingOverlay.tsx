import { createPortal } from 'react-dom';
import { Spinner } from '@/components/Spinner';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export function LoadingOverlay({ show, message = 'Refreshing...' }: LoadingOverlayProps) {
  if (!show) return null;
  const label = message || 'Loading';
  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-level-1/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="min-h-[1.25rem] text-center text-sm font-medium text-level-4">
          {message || '\u00A0'}
        </span>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}
