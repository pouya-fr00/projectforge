import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type AdminUser = { id: string; email: string; name?: string; role?: string };
type AdminDashboardState =
  | { status: 'loading' }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; users: AdminUser[] };

export default function Admin() {
  const [state, setState] = useState<AdminDashboardState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/users', {
      signal: controller.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (res.status === 401) { setState({ status: 'unauthorized' }); return null; }
        if (res.status === 403) { setState({ status: 'forbidden' }); return null; }
        if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const users = Array.isArray(data.users) ? (data.users as AdminUser[]) : [];
        setState(users.length === 0 ? { status: 'empty' } : { status: 'ready', users });
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'unknown error' });
      });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <p>Loading admin dashboard…</p>;

  if (state.status === 'error') return (
    <section aria-label="admin dashboard error" className="state-box">
      <h2>Something went wrong</h2>
      <p className="error-state" role="alert">{state.message}</p>
      <div className="state-box-actions">
        <Link to="/" className="btn btn-secondary">Back to Home</Link>
      </div>
    </section>
  );

  if (state.status === 'unauthorized') return (
    <section aria-label="admin dashboard unauthorized" className="state-box">
      <h2>Sign in required</h2>
      <p>Please sign in to access the admin dashboard.</p>
      <div className="state-box-actions">
        <Link to="/sign-in" className="btn btn-primary">Sign in</Link>
        <Link to="/" className="btn btn-secondary">Back to Home</Link>
      </div>
    </section>
  );

  if (state.status === 'forbidden') return (
    <section aria-label="admin dashboard forbidden" className="state-box">
      <h2>Access denied</h2>
      <p>Your account does not have permission to view this page.</p>
      <div className="state-box-actions">
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </section>
  );

  if (state.status === 'empty') return (
    <section aria-label="admin dashboard empty" className="state-box">
      <h2>Admin Dashboard</h2>
      <p>No users to display.</p>
    </section>
  );

  return (
    <section aria-label="admin dashboard">
      <div className="section-header">
        <h1>Admin Dashboard</h1>
        <p>View users and their roles.</p>
      </div>

      {/* Desktop table */}
      <div className="admin-table-wrap card">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <span className="badge">{u.role || 'user'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="admin-cards-wrap">
        {state.users.map((u) => (
          <div key={u.id} className="admin-user-card">
            <div className="admin-user-card-body">
              <p className="admin-user-card-name">{u.name || '—'}</p>
              <p className="admin-user-card-email">{u.email}</p>
            </div>
            <span className="badge">{u.role || 'user'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
