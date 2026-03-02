import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

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
  const { theme, toggleTheme, isDark } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button type="button" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  it('provides default dark theme when no localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
  });

  it('provides light theme when stored in localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    localStorage.setItem('theme', 'dark');
  });

  it('toggleTheme flips theme and updates localStorage', async () => {
    localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle/i }));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.getItem('theme')).toBe('light');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle/i }));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('useTheme throws outside ThemeProvider', () => {
    const expectedMsg = 'useTheme must be used within ThemeProvider';
    const handleError = (e: ErrorEvent): void => {
      if (e.message?.includes(expectedMsg)) {
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleError);
    try {
      const { caught } = catchErrorBoundary(<TestConsumer />);
      expect(caught?.message).toBe(expectedMsg);
    } finally {
      window.removeEventListener('error', handleError);
    }
  });
});
