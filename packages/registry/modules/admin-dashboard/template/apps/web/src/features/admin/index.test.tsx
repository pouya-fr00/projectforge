import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './index';

describe('AdminDashboard', () => {
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
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading admin dashboard\u2026')).toBeInTheDocument();
  });

  it('shows unauthorized state when session is missing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('admin dashboard unauthorized')).toBeInTheDocument());
    expect(screen.getByText('Please sign in to access the admin dashboard.')).toBeInTheDocument();
  });

  it('shows forbidden state for normal user without admin permission', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 403,
      ok: false,
    } as Response);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('admin dashboard forbidden')).toBeInTheDocument());
    expect(screen.getByText('Your account does not have permission to view this page.')).toBeInTheDocument();
  });

  it('shows error state on network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network failure'));

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('admin dashboard error')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('network failure');
  });

  it('shows empty state when no users exist', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ users: [] }),
    } as Response);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('admin dashboard empty')).toBeInTheDocument());
    expect(screen.getByText('No users to display.')).toBeInTheDocument();
  });

  it('renders user table and mobile cards with Name/Email/Role', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        users: [
          { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
          { id: '2', email: 'user@example.com', name: 'Regular User', role: 'user' },
        ],
      }),
    } as Response);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('admin dashboard')).toBeInTheDocument());
    // Desktop table + mobile cards — names appear twice
    expect(screen.getAllByText('Admin User').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Regular User').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('admin@example.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('user@example.com').length).toBeGreaterThanOrEqual(1);
    // Role badges (multiple renders — table + mobile cards)
    expect(screen.getAllByText('admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('user').length).toBeGreaterThanOrEqual(1);
    // Admin cards container exists for mobile
    expect(document.querySelector('.admin-cards-wrap')).toBeInTheDocument();
    expect(document.querySelector('.admin-table-wrap')).toBeInTheDocument();
  });
});
