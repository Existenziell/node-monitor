import type { ReactNode } from 'react';
import { API_SERVER_HINT } from '@/constants';
import { getErrorMessage } from '@/utils';
import { Spinner } from '@/components/Spinner';

interface LoadingErrorGateProps<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
  loadingLabel: string;
  errorLabel?: string;
  /** If set, used instead of API_SERVER_HINT (e.g. wallet tab adds "A wallet must be loaded."). */
  errorHint?: ReactNode;
  children: ReactNode;
}

export function LoadingErrorGate<T>({
  loading,
  error,
  data,
  loadingLabel,
  errorLabel,
  errorHint,
  children,
}: LoadingErrorGateProps<T>) {
  if (loading && !data) {
    return (
      <div className="p-4 text-level-4 flex items-center gap-2" role="status" aria-live="polite">
        <Spinner size="sm" />
        Loading {loadingLabel}…
      </div>
    );
  }

  if (error && !data) {
    const label = errorLabel ?? loadingLabel;
    const hint = errorHint ?? API_SERVER_HINT;
    return (
      <div className="p-4 text-semantic-error" role="alert">
        Error loading {label}: {getErrorMessage(error)}. {hint}
      </div>
    );
  }

  return <>{children}</>;
}
