import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignIn from '../pages/SignIn';

describe('SignIn', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const renderSignIn = () =>
    render(
      <MemoryRouter initialEntries={['/sign-in']}>
        <SignIn />
      </MemoryRouter>
    );

  it('renders the sign-in form with email and password fields', () => {
    renderSignIn();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows loading state when submitting', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderSignIn();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid email or password.' }),
    } as Response);
    renderSignIn();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.'));
  });

  it('shows network error on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    renderSignIn();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network error'));
  });

  it('has a link to the sign-up page', () => {
    renderSignIn();
    expect(screen.getByText('Sign up').closest('a')).toHaveAttribute('href', '/sign-up');
  });
});
