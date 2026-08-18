import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import { AuthProvider } from './lib/auth';

vi.mock('./features', () => ({
  webFeatures: [],
  webNavItems: [
    { path: 'comments', title: 'Comments', description: 'Read and share comments.' },
    { path: 'dashboard', title: 'Dashboard', description: 'View your account.' },
    { path: 'admin', title: 'Admin Dashboard', description: 'Manage users.' },
  ],
}));

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const renderApp = (initialEntry = '/') => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <AuthProvider>
              <App />
            </AuthProvider>
          ),
          children: [{ index: true, element: <Home /> }],
        },
      ],
      { initialEntries: [initialEntry] }
    );
    return render(<RouterProvider router={router} />);
  };

  it('renders main navigation landmark', () => {
    renderApp();
    expect(screen.getByLabelText('main navigation')).toBeInTheDocument();
  });

  it('renders home content at root', () => {
    renderApp();
    expect(screen.getByText('Your Project Factory application is ready.')).toBeInTheDocument();
  });

  it('renders sign-in and sign-up links when not authenticated', async () => {
    renderApp();
    const signIns = await screen.findAllByText('Sign in');
    expect(signIns.length).toBeGreaterThanOrEqual(1);
    const signUps = screen.getAllByText('Sign up');
    expect(signUps.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Comments link for anonymous users', () => {
    renderApp();
    expect(screen.getAllByText('Comments').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show Dashboard or Admin links for anonymous users', async () => {
    renderApp();
    // Wait for auth fetch to settle — Sign in appears in both desktop and mobile nav
    await screen.findAllByText('Sign in');
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Admin Dashboard')).toBeNull();
  });

  it('shows Dashboard and Admin when admin is authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', email: 'a@b.com', name: 'Admin', role: 'admin' } }),
    } as Response);
    renderApp();
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Admin Dashboard').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Dashboard but not Admin for normal user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '2', email: 'u@b.com', name: 'User', role: 'user' } }),
    } as Response);
    renderApp();
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });
  });
});
