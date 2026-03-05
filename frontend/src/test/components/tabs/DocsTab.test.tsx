import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsTab } from '@/components/tabs/DocsTab';
import { GITHUB_REPO_URL } from '@/constants';

describe('DocsTab', () => {
  it('renders Node Monitor docs heading', () => {
    render(<DocsTab />);
    expect(screen.getByRole('heading', { name: /Node Monitor docs/i })).toBeInTheDocument();
  });

  it('renders README link with repo URL', () => {
    render(<DocsTab />);
    const readmeLink = screen.getByRole('link', { name: /README on GitHub/i });
    expect(readmeLink).toBeInTheDocument();
    expect(readmeLink).toHaveAttribute('href', `${GITHUB_REPO_URL}/blob/main/README.md`);
    expect(readmeLink).toHaveAttribute('target', '_blank');
  });

  it('renders Overview and Main features sections', () => {
    render(<DocsTab />);
    expect(screen.getByRole('heading', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Main features/i })).toBeInTheDocument();
  });
});
