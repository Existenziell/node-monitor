import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabNav } from '@/components/TabNav';

describe('TabNav', () => {
  it('renders tab buttons for each tab', () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    render(
      <TabNav
        activeTab="node"
        onTabChange={onTabChange}
        onRefresh={onRefresh}
        isMobileMenuOpen={false}
        onCloseMobileMenu={() => {}}
      />
    );
    // TabNav renders tabs in both desktop nav and mobile drawer; either set is in the DOM
    expect(screen.getAllByRole('button', { name: /node/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /network/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /blocks/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /wallet/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /console/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /docs/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /settings/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Refresh').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onTabChange when a tab button is clicked', async () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <TabNav
        activeTab="node"
        onTabChange={onTabChange}
        onRefresh={onRefresh}
        isMobileMenuOpen={false}
        onCloseMobileMenu={() => {}}
      />
    );
    const blocksButtons = screen.getAllByRole('button', { name: /blocks/i });
    await user.click(blocksButtons[0]);
    expect(onTabChange).toHaveBeenCalledWith('blocks');
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onTabChange = vi.fn();
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    render(
      <TabNav
        activeTab="node"
        onTabChange={onTabChange}
        onRefresh={onRefresh}
        isMobileMenuOpen={false}
        onCloseMobileMenu={() => {}}
      />
    );
    const refreshButtons = screen.getAllByTitle('Refresh');
    await user.click(refreshButtons[0]);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
