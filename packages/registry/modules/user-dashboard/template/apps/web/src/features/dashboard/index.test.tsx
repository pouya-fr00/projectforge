import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './index';

describe('Dashboard', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading dashboard\u2026')).toBeInTheDocument();
  });

  it('shows unauthorized state when session is missing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('dashboard unauthorized')).toBeInTheDocument());
    expect(screen.getByText('You need to sign in to view your dashboard.')).toBeInTheDocument();
  });

  it('shows error state on network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network failure'));

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('dashboard error')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('network failure');
  });

  it('renders account card with name, email, and role badge', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        user: { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' },
      }),
    } as Response);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('user dashboard')).toBeInTheDocument());
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('does not show fake Profile or Settings cards', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        user: { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' },
      }),
    } as Response);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('user dashboard')).toBeInTheDocument());
    expect(screen.queryByText('Profile')).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('shows empty state when user data is absent', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({}),
    } as Response);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('dashboard empty')).toBeInTheDocument());
    expect(screen.getByText('No profile data available right now.')).toBeInTheDocument();
  });
});
