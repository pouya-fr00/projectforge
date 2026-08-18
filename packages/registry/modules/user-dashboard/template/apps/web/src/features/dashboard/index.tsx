import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthUser } from '@workspace/contracts/auth';

type DashboardState =
  | { status: 'loading' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; user: AuthUser };

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', {
      signal: controller.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (res.status === 401) { setState({ status: 'unauthorized' }); return null; }
        if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.user) setState({ status: 'ready', user: data.user as AuthUser });
        else if (data) setState({ status: 'empty' });
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'unknown error' });
      });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <p>Loading dashboard…</p>;

  if (state.status === 'error') return (
    <section aria-label="dashboard error" className="state-box">
      <h2>Something went wrong</h2>
      <p className="error-state" role="alert">{state.message}</p>
      <div className="state-box-actions">
        <Link to="/" className="btn btn-secondary">Back to Home</Link>
      </div>
    </section>
  );

  if (state.status === 'unauthorized') return (
    <section aria-label="dashboard unauthorized" className="state-box">
      <h2>Sign in required</h2>
      <p>You need to sign in to view your dashboard.</p>
      <div className="state-box-actions">
        <Link to="/sign-in" className="btn btn-primary">Sign in</Link>
        <Link to="/" className="btn btn-secondary">Back to Home</Link>
      </div>
    </section>
  );

  if (state.status === 'empty') return (
    <section aria-label="dashboard empty" className="state-box">
      <h2>Dashboard</h2>
      <p>No profile data available right now.</p>
    </section>
  );

  const { user } = state;
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <section aria-label="user dashboard">
      <div className="section-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user.name || user.email}</p>
      </div>

      <article className="card" aria-label="account overview">
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
          <div
            aria-hidden="true"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '9999px',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {initials || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              Account
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-1)' }}>
              {user.name && <>{user.name} &middot; </>}
              {user.email}
            </p>
            <span className="badge">{user.role || 'user'}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
