import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '@/contexts/ApiContext';
import { ConsoleTab } from '@/components/tabs/ConsoleTab';

function WrappedConsoleTab() {
  return (
    <ApiProvider>
      <ConsoleTab />
    </ApiProvider>
  );
}

describe('ConsoleTab', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders RPC Console section with Method label and default getblockchaininfo', () => {
    render(<WrappedConsoleTab />);
    expect(screen.getByRole('heading', { name: /RPC Console/i })).toBeInTheDocument();
    const methodInput = screen.getByLabelText(/Method/i);
    expect(methodInput).toBeInTheDocument();
    expect(methodInput).toHaveValue('getblockchaininfo');
  });

  it('renders Params label and textarea', () => {
    render(<WrappedConsoleTab />);
    expect(screen.getByLabelText(/Params \(JSON array\)/i)).toBeInTheDocument();
    const paramsField = screen.getByPlaceholderText('[]');
    expect(paramsField).toHaveValue('[]');
  });

  it('renders Execute button', () => {
    render(<WrappedConsoleTab />);
    expect(screen.getByRole('button', { name: /Execute/i })).toBeInTheDocument();
  });

  it('shows response placeholder before execution', () => {
    render(<WrappedConsoleTab />);
    expect(screen.getByText(/Response will appear here after Execute/i)).toBeInTheDocument();
  });

  it('shows error when Execute with empty method', async () => {
    const user = userEvent.setup();
    render(<WrappedConsoleTab />);
    const methodInput = screen.getByLabelText(/Method/i);
    await user.clear(methodInput);
    await user.click(screen.getByRole('button', { name: /Execute/i }));
    expect(screen.getByText(/Method is required/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls RPC with method and params when Execute is clicked', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    });
    render(<WrappedConsoleTab />);
    await act(async () => {
      screen.getByRole('button', { name: /Execute/i }).click();
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rpc'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getblockchaininfo', params: [] }),
      })
    );
  });
});
