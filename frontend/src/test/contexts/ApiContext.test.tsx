import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ApiProvider, useApi } from '@/contexts/ApiContext';

function catchErrorBoundary(children: React.ReactNode): { caught: Error | null } {
  let caught: Error | null = null;
  class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError(err: Error) {
      caught = err;
      return { hasError: true };
    }

    render() {
      return this.state.hasError ? null : this.props.children;
    }
  }
  render(<Boundary>{children}</Boundary>);
  return { caught };
}

function TestConsumer() {
  const api = useApi();
  return (
    <div>
      <span data-testid="base-url">{api.apiBaseUrl}</span>
      <button
        type="button"
        onClick={() => api.fetchNode().then(() => {})}
      >
        Fetch Node
      </button>
    </div>
  );
}

describe('ApiContext', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('provides apiBaseUrl', () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: {} }),
    });
    render(
      <ApiProvider>
        <TestConsumer />
      </ApiProvider>
    );
    expect(screen.getByTestId('base-url')).toHaveTextContent('/api');
  });

  it('fetchNode calls fetch with /api/node and returns data', async () => {
    const mockData = { blockchain: { blocks: 800000 }, network: {} };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: mockData }),
    });
    let resolvedData: unknown = null;
    function Consumer() {
      const api = useApi();
      return (
        <button
          type="button"
          onClick={async () => {
            resolvedData = await api.fetchNode();
          }}
        >
          Fetch
        </button>
      );
    }
    render(
      <ApiProvider>
        <Consumer />
      </ApiProvider>
    );
    await act(async () => {
      (screen.getByRole('button', { name: /fetch/i }) as HTMLButtonElement).click();
    });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/node'));
    expect(resolvedData).toEqual(mockData);
  });

  it('useApi throws outside ApiProvider', () => {
    function BadConsumer() {
      useApi();
      return null;
    }
    const expectedMsg = 'useApi must be used within ApiProvider';
    const handleError = (e: ErrorEvent): void => {
      if (e.message?.includes(expectedMsg)) {
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleError);
    try {
      const { caught } = catchErrorBoundary(<BadConsumer />);
      expect(caught?.message).toBe(expectedMsg);
    } finally {
      window.removeEventListener('error', handleError);
    }
  });
});
