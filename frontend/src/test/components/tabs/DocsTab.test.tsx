import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsTab } from '@/components/tabs/DocsTab';
import {
  GITHUB_REPO_URL,
  BITCOIN_CORE_GITHUB_URL,
  BITCOIN_RPC_DOCS_URL,
} from '@/data/links';

describe('DocsTab', () => {
  it('renders Node Monitor docs heading', () => {
    render(<DocsTab />);
    expect(screen.getByRole('heading', { name: /Node Monitor docs/i })).toBeInTheDocument();
  });

  it('renders README link with repo URL', () => {
    render(<DocsTab />);
    const readmeLinks = screen.getAllByRole('link', { name: /README on GitHub/i });
    expect(readmeLinks.length).toBeGreaterThanOrEqual(1);
    expect(readmeLinks[0]).toHaveAttribute('href', `${GITHUB_REPO_URL}/blob/main/README.md`);
    expect(readmeLinks[0]).toHaveAttribute('target', '_blank');
  });

  it('renders Overview, Main features, Architecture, and Tabs at a glance sections', () => {
    render(<DocsTab />);
    expect(screen.getByRole('heading', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Main features/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Architecture/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tabs at a glance/i })).toBeInTheDocument();
  });

  it('renders Bitcoin Core GitHub link', () => {
    render(<DocsTab />);
    const link = screen.getByRole('link', { name: /Bitcoin Core \(GitHub\)/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', BITCOIN_CORE_GITHUB_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders Bitcoin Core RPC reference link', () => {
    render(<DocsTab />);
    const links = screen.getAllByRole('link', { name: /Bitcoin Core RPC reference/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute('href', BITCOIN_RPC_DOCS_URL);
    expect(links[0]).toHaveAttribute('target', '_blank');
  });
});
