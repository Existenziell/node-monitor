import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ApiProvider } from '@/contexts/ApiContext';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

function WrappedApp() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <RefreshProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </RefreshProvider>
      </ApiProvider>
    </ThemeProvider>
  );
}

describe('App', () => {
  it('renders Bitcoin Dashboard title', async () => {
    await act(async () => {
      render(<WrappedApp />);
    });
    expect(screen.getByText('Bitcoin Dashboard')).toBeInTheDocument();
  });

  it('renders tab navigation', async () => {
    await act(async () => {
      render(<WrappedApp />);
    });
    expect(screen.getByRole('button', { name: /node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /network/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /blocks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /console/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /docs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });
});
