import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.code || 'Invalid email or password.');
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-subtitle">Welcome back</p>

        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signin-password">
              Password
            </label>
            <input
              id="signin-password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/sign-up">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
