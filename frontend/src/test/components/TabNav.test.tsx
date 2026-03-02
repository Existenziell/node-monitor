import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabNav } from '@/components/TabNav';

describe('TabNav', () => {
  it('renders tab buttons for each tab', () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    render(
      <TabNav activeTab="node" onTabChange={onTabChange} onRefresh={onRefresh} />
    );
    expect(screen.getByRole('button', { name: /node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /blocks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /console/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab button is clicked', async () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <TabNav activeTab="node" onTabChange={onTabChange} onRefresh={onRefresh} />
    );
    await user.click(screen.getByRole('button', { name: /blocks/i }));
    expect(onTabChange).toHaveBeenCalledWith('blocks');
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <TabNav activeTab="node" onTabChange={onTabChange} onRefresh={onRefresh} />
    );
    await user.click(screen.getByTitle('Refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
