import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { AuthProvider } from '../lib/auth';

vi.mock('../features', () => ({
  webFeatures: [],
  webNavItems: [
    { path: 'comments', title: 'Comments', description: 'Read and share comments.' },
    { path: 'dashboard', title: 'Dashboard', description: 'View your account.' },
    { path: 'admin', title: 'Admin Dashboard', description: 'Manage users.' },
  ],
}));

describe('Header', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const renderHeader = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders the app brand link', () => {
    renderHeader();
    expect(screen.getByText('{{PROJECT_NAME}}')).toBeInTheDocument();
  });

  describe('anonymous', () => {
    it('shows Comments in nav', async () => {
      renderHeader();
      await screen.findAllByText('Comments');
      expect(screen.getAllByText('Comments').length).toBeGreaterThanOrEqual(1);
    });

    it('does not show Dashboard link', async () => {
      renderHeader();
      // Wait for auth fetch to complete — Sign in appears in both desktop and mobile nav
      await screen.findAllByText('Sign in');
      expect(screen.queryAllByText('Dashboard').length).toBe(0);
    });

    it('does not show Admin link', () => {
      renderHeader();
      expect(screen.queryAllByText('Admin Dashboard').length).toBe(0);
    });

    it('shows Sign in and Sign up', async () => {
      renderHeader();
      const signIns = await screen.findAllByText('Sign in');
      expect(signIns.length).toBeGreaterThanOrEqual(1);
      const signUps = screen.getAllByText('Sign up');
      expect(signUps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('normal authenticated user', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: '1', email: 'u@b.com', name: 'Normal', role: 'user' } }),
      } as Response);
    });

    it('shows Comments and Dashboard', async () => {
      renderHeader();
      await screen.findAllByText('Normal');
      expect(screen.getAllByText('Comments').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });

    it('does not show Admin link', async () => {
      renderHeader();
      await screen.findAllByText('Normal');
      expect(screen.queryAllByText('Admin Dashboard').length).toBe(0);
    });

    it('shows identity and Sign out', async () => {
      renderHeader();
      await screen.findAllByText('Normal');
      expect(screen.getAllByText('Sign out').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin user', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: '2', email: 'a@b.com', name: 'Admin', role: 'admin' } }),
      } as Response);
    });

    it('shows Comments, Dashboard, and Admin', async () => {
      renderHeader();
      await screen.findAllByText('Admin');
      expect(screen.getAllByText('Comments').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Admin Dashboard').length).toBeGreaterThanOrEqual(1);
    });

    it('shows identity and Sign out', async () => {
      renderHeader();
      await screen.findAllByText('Admin');
      expect(screen.getAllByText('Sign out').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mobile menu', () => {
    it('uses the same filtered nav as desktop', async () => {
      renderHeader();
      // Open mobile menu
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      const mobileNav = screen.getByRole('dialog');
      expect(mobileNav).toHaveClass('open');

      // Anonymous: should have Comments in mobile, no Dashboard
      await screen.findAllByText('Sign in');
      const commentsInMobile = mobileNav.querySelectorAll('a');
      const commentLinks = Array.from(commentsInMobile).filter((a) => a.textContent === 'Comments');
      expect(commentLinks.length).toBe(1);
      const dashboardInMobile = Array.from(mobileNav.querySelectorAll('a')).filter((a) => a.textContent === 'Dashboard');
      expect(dashboardInMobile.length).toBe(0);
    });
  });

  it('hamburger has correct aria attributes', () => {
    renderHeader();
    const hamburger = screen.getByLabelText('Open navigation menu');
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav');
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});
