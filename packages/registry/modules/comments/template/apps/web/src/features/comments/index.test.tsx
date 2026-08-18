import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Comments from './index';

describe('Comments', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    // Return never-resolving promises for both fetches
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading comments\u2026')).toBeInTheDocument();
  });

  it('shows error state on non-OK response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ status: 500, ok: false } as Response) // comments
      .mockResolvedValueOnce({ status: 401, ok: false } as Response); // auth

    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('comments error')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500');
  });

  it('shows error state on network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValue({ status: 401, ok: false } as Response);

    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('comments error')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('network failure');
  });

  it('shows auth prompt and empty list when anonymous', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ comments: [] }) } as Response)
      .mockResolvedValueOnce({ status: 401, ok: false } as Response);

    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('comments empty')).toBeInTheDocument());
    // Anonymous should see auth prompt
    expect(screen.getByText('Join the conversation')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Create account')).toBeInTheDocument();
  });

  it('shows composer and comment list when authenticated', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          comments: [
            { id: 'c1', body: 'First comment', userId: 'u1', postId: 'p1', createdAt: 1, updatedAt: 1 },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ user: { id: 'u1' } }),
      } as Response);

    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('comments list')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Write a comment…')).toBeInTheDocument();
    expect(screen.getByText('Post Comment')).toBeInTheDocument();
    expect(screen.getByText('First comment')).toBeInTheDocument();
    // Post/User IDs should NOT be rendered in user-visible UI
    expect(screen.queryByText(/Post:/)).toBeNull();
    expect(screen.queryByText(/User:/)).toBeNull();
  });

  it('does not show composer when anonymous with comments present', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          comments: [
            { id: 'c1', body: 'A comment', userId: 'u1', postId: 'p1', createdAt: 1, updatedAt: 1 },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({ status: 401, ok: false } as Response);

    render(
      <BrowserRouter>
        <Comments />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByLabelText('comments list')).toBeInTheDocument());
    expect(screen.queryByPlaceholderText('Write a comment…')).toBeNull();
    expect(screen.getByText('Join the conversation')).toBeInTheDocument();
  });
});
