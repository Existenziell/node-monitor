interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export function LoadingOverlay({ show, message = 'Refreshing...' }: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-level-1/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-level-3 border-t-accent"
          aria-hidden
        />
        <span className="text-sm font-medium text-level-4">{message}</span>
      </div>
    </div>
  );
}
