import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleProvider, useConsole } from '@/contexts/ConsoleContext';

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
  const { lines, log, clear, connectionStatus, setConnectionStatus } = useConsole();
  return (
    <div>
      <div data-testid="lines-count">{lines.length}</div>
      <div data-testid="status">{connectionStatus}</div>
      {lines.length > 0 && (
        <div data-testid="first-message">{lines[0].message}</div>
      )}
      <button type="button" onClick={() => log('hello', 'info')}>
        Log
      </button>
      <button type="button" onClick={() => log('error', 'error')}>
        Log Error
      </button>
      <button type="button" onClick={clear}>
        Clear
      </button>
      <button type="button" onClick={() => setConnectionStatus('connected')}>
        Connect
      </button>
    </div>
  );
}

describe('ConsoleContext', () => {
  it('starts with empty lines and disconnected status', () => {
    render(
      <ConsoleProvider>
        <TestConsumer />
      </ConsoleProvider>
    );
    expect(screen.getByTestId('lines-count')).toHaveTextContent('0');
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
  });

  it('log adds a line with message and type', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleProvider>
        <TestConsumer />
      </ConsoleProvider>
    );
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^log$/i }));
    });
    expect(screen.getByTestId('lines-count')).toHaveTextContent('1');
    expect(screen.getByTestId('first-message')).toHaveTextContent('hello');
  });

  it('clear empties lines', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleProvider>
        <TestConsumer />
      </ConsoleProvider>
    );
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^log$/i }));
    });
    expect(screen.getByTestId('lines-count')).toHaveTextContent('1');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /clear/i }));
    });
    expect(screen.getByTestId('lines-count')).toHaveTextContent('0');
  });

  it('setConnectionStatus updates status', async () => {
    const user = userEvent.setup();
    render(
      <ConsoleProvider>
        <TestConsumer />
      </ConsoleProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /connect/i }));
    });
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
  });

  it('useConsole throws outside ConsoleProvider', () => {
    const expectedMsg = 'useConsole must be used within ConsoleProvider';
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
