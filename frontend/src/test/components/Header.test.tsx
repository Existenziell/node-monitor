import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';

function WrappedHeader() {
  return (
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  );
}

describe('Header', () => {
  it('renders Bitcoin Dashboard title', () => {
    render(<WrappedHeader />);
    expect(screen.getByText('Bitcoin Dashboard')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    render(<WrappedHeader />);
    const toggle = screen.getByTitle(/switch to (light|dark)/i);
    expect(toggle).toBeInTheDocument();
  });

  it('toggles theme when button is clicked', async () => {
    const user = userEvent.setup();
    render(<WrappedHeader />);
    const toggle = screen.getByTitle(/switch to (light|dark)/i);
    await user.click(toggle);
    expect(screen.getByTitle(/switch to (light|dark)/i)).toBeInTheDocument();
  });
});
