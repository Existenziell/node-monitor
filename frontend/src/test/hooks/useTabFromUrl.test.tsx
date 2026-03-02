import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';

function TestComponent() {
  const { activeTab, setTab } = useTabFromUrl();
  return (
    <div>
      <span data-testid="tab">{activeTab}</span>
      <button type="button" onClick={() => setTab('blocks')}>
        Blocks
      </button>
      <button type="button" onClick={() => setTab('wallet')}>
        Wallet
      </button>
    </div>
  );
}

describe('useTabFromUrl', () => {
  it('returns node when no tab in URL', () => {
    window.history.replaceState({}, '', '/');
    render(<TestComponent />);
    expect(screen.getByTestId('tab')).toHaveTextContent('node');
  });

  it('returns tab from URL when valid', () => {
    window.history.replaceState({}, '', '/?tab=blocks');
    render(<TestComponent />);
    expect(screen.getByTestId('tab')).toHaveTextContent('blocks');
  });

  it('setTab updates state and URL', async () => {
    window.history.replaceState({}, '', '/');
    const user = userEvent.setup();
    render(<TestComponent />);
    expect(screen.getByTestId('tab')).toHaveTextContent('node');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /blocks/i }));
    });
    expect(screen.getByTestId('tab')).toHaveTextContent('blocks');
    expect(window.location.search).toContain('tab=blocks');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /wallet/i }));
    });
    expect(screen.getByTestId('tab')).toHaveTextContent('wallet');
    expect(window.location.search).toContain('tab=wallet');
  });
});
