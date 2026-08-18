import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignUp from '../pages/SignUp';

describe('SignUp', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const renderSignUp = () =>
    render(
      <MemoryRouter initialEntries={['/sign-up']}>
        <SignUp />
      </MemoryRouter>
    );

  it('renders all required fields', () => {
    renderSignUp();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('shows loading state when submitting', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderSignUp();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeInTheDocument();
  });

  it('shows error on server rejection', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Email already in use.' }),
    } as Response);
    renderSignUp();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email already in use.'));
  });

  it('shows network error on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    renderSignUp();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network error'));
  });

  it('has a link to the sign-in page', () => {
    renderSignUp();
    expect(screen.getByText('Sign in').closest('a')).toHaveAttribute('href', '/sign-in');
  });
});
