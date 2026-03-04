import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConsoleProvider } from '@/contexts/ConsoleContext';
import { ApiProvider } from '@/contexts/ApiContext';

function WrappedApp() {
  return (
    <ThemeProvider>
      <ConsoleProvider>
        <ApiProvider>
          <App />
        </ApiProvider>
      </ConsoleProvider>
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
    expect(screen.getByRole('button', { name: /blocks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wallet/i })).toBeInTheDocument();
  });
});
