import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';

const CHAIN_TIP_POLL_MS = 5000;

function TestConsumer() {
  const { notifications } = useNotifications();
  return (
    <div data-testid="consumer">
      {notifications.length > 0 ? notifications[0].message : 'none'}
    </div>
  );
}

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('dispatches tab-refresh for blocks, network, and node when new block is detected', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { height: 100, mining_pool: null },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { height: 101, mining_pool: null },
          }),
      });

    const tabRefreshDetails: string[] = [];
    const handler = (e: Event) => {
      tabRefreshDetails.push((e as CustomEvent).detail);
    };
    window.addEventListener('tab-refresh', handler);

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      vi.advanceTimersByTime(CHAIN_TIP_POLL_MS);
    });

    expect(tabRefreshDetails).toContain('blocks');
    expect(tabRefreshDetails).toContain('network');
    expect(tabRefreshDetails).toContain('node');
    expect(tabRefreshDetails).toHaveLength(3);

    window.removeEventListener('tab-refresh', handler);
  });
});
