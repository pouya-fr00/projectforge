import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { AuthProvider, useAuth } from '../lib/auth';

vi.mock('../features', () => ({
  webFeatures: [],
  webNavItems: [
    { path: 'comments', title: 'Comments', description: 'Public comments.' },
    { path: 'dashboard', title: 'Dashboard', description: 'Your dashboard.' },
    { path: 'admin', title: 'Admin Dashboard', description: 'Manage users.' },
  ],
}));

function SignOutTrigger() {
  const { signOut } = useAuth();
  return <button onClick={() => void signOut()}>trigger-sign-out</button>;
}

function RefreshTrigger() {
  const { refresh } = useAuth();
  return <button onClick={() => void refresh()}>trigger-refresh</button>;
}

describe('Home', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const renderHome = () =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <Home />
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders welcome heading', () => {
    renderHome();
    expect(screen.getByText('Welcome to {{PROJECT_NAME}}')).toBeInTheDocument();
  });

  describe('anonymous', () => {
    it('shows Comments card only, no Dashboard or Admin', async () => {
      renderHome();
      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
      });
      expect(screen.queryByText('Dashboard')).toBeNull();
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });

    it('home cards are links', async () => {
      renderHome();
      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
      });
      const links = screen.getAllByRole('link');
      const commentsLink = links.find((l) => l.textContent?.includes('Comments'));
      expect(commentsLink).toBeDefined();
      expect(commentsLink?.getAttribute('href')).toBe('/comments');
    });
  });

  describe('normal user', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { role: 'user' } }),
      } as Response);
    });

    it('shows Comments and Dashboard cards', async () => {
      renderHome();
      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });
  });

  describe('admin', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { role: 'admin' } }),
      } as Response);
    });

    it('shows all three cards', async () => {
      renderHome();
      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });
});

describe('auth-state synchronization', () => {
  it('removes Dashboard card immediately after sign-out without remount', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '1', email: 'u@b.com', name: 'User', role: 'user' } }),
      } as Response);
    render(
      <MemoryRouter>
        <AuthProvider>
          <Home />
          <SignOutTrigger />
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    fireEvent.click(screen.getByText('trigger-sign-out'));
    await waitFor(() => expect(screen.queryByText('Dashboard')).toBeNull());
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('adds Dashboard card immediately after sign-in without remount', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '1', email: 'u@b.com', name: 'User', role: 'user' } }),
      } as Response);
    render(
      <MemoryRouter>
        <AuthProvider>
          <Home />
          <RefreshTrigger />
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Comments')).toBeInTheDocument());
    expect(screen.queryByText('Dashboard')).toBeNull();
    fireEvent.click(screen.getByText('trigger-refresh'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('removes Admin and Dashboard cards for admin sign-out without remount', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '1', email: 'a@b.com', name: 'Admin', role: 'admin' } }),
      } as Response);
    render(
      <MemoryRouter>
        <AuthProvider>
          <Home />
          <SignOutTrigger />
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('trigger-sign-out'));
    await waitFor(() => {
      expect(screen.queryByText('Dashboard')).toBeNull();
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });
});
