import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { webNavItems } from '../features';
import { isNavVisible } from '../lib/visibility';
import { useAuth } from '../lib/auth';

export default function Header() {
  const { user, loading, refresh, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Filter nav items by role/session using shared visibility policy
  const visibleNav = useMemo(
    () => webNavItems.filter((item) => isNavVisible(item, user)),
    [user]
  );

  // Re-sync session state on navigation so sign-in/sign-out is reflected.
  useEffect(() => {
    void refresh();
  }, [location.pathname, refresh]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  return (
    <header className="app-header">
      <Link to="/" className="app-header-brand">
        {{PROJECT_NAME}}
      </Link>

      {/* Desktop nav */}
      <nav className="app-nav" aria-label="main navigation">
        <Link to="/" className="app-nav-link" aria-current={location.pathname === '/' ? 'page' : undefined}>
          Home
        </Link>
        {visibleNav.map((item) => (
          <Link
            key={item.path}
            to={`/${item.path}`}
            className="app-nav-link"
            aria-current={location.pathname === `/${item.path}` ? 'page' : undefined}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      {/* Desktop auth */}
      <div className="app-auth" aria-label="account actions">
        {loading ? (
          <span className="app-auth-loading" aria-busy="true">
            …
          </span>
        ) : user ? (
          <>
            <span className="app-auth-user">{user.name || user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link to="/sign-up" className="btn btn-primary btn-sm">
              Sign up
            </Link>
          </>
        )}
      </div>

      {/* Hamburger */}
      <button
        className="app-hamburger"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <span className="app-hamburger-icon">
          <span />
          <span />
          <span />
        </span>
      </button>

      {/* Mobile nav overlay */}
      <div id="mobile-nav" className={`app-mobile-nav${menuOpen ? ' open' : ''}`} role="dialog" aria-label="navigation menu">
        <Link
          to="/"
          className="app-mobile-nav-link"
          aria-current={location.pathname === '/' ? 'page' : undefined}
        >
          Home
        </Link>
        {visibleNav.map((item) => (
          <Link
            key={item.path}
            to={`/${item.path}`}
            className="app-mobile-nav-link"
            aria-current={location.pathname === `/${item.path}` ? 'page' : undefined}
          >
            {item.title}
          </Link>
        ))}
        <div className="app-mobile-nav-divider" />
        <div className="app-mobile-nav-auth">
          {loading ? (
            <span className="app-auth-loading">Loading…</span>
          ) : user ? (
            <>
              <span className="app-auth-user">{user.name || user.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="btn btn-secondary btn-block btn-sm">
                Sign in
              </Link>
              <Link to="/sign-up" className="btn btn-primary btn-block btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
