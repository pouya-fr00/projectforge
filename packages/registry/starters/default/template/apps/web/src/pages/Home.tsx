import { Link } from 'react-router-dom';
import { webNavItems } from '../features';
import { isNavVisible } from '../lib/visibility';
import { useAuth } from '../lib/auth';

function ModuleIcon({ path }: { path: string }): JSX.Element {
  switch (path) {
    case 'comments':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      );
  }
}

export default function Home() {
  const { user, loading } = useAuth();

  const visibleCards = webNavItems.filter((item) => isNavVisible(item, user));

  return (
    <div>
      <section className="section-header">
        <h2>Welcome to {{PROJECT_NAME}}</h2>
        <p>Your Project Factory application is ready.</p>
      </section>

      {loading ? (
        <p>Loading…</p>
      ) : visibleCards.length > 0 ? (
        <div className="home-grid">
          {visibleCards.map((item) => (
            <Link key={item.path} to={`/${item.path}`} className="home-card">
              <span className="home-card-icon" aria-hidden="true">
                <ModuleIcon path={item.path} />
              </span>
              <span className="home-card-body">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </span>
              <span className="home-card-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="state-box">
          <h2>No modules available</h2>
          <p>
            Use <code>projectforge add</code> to install modules and build your application.
          </p>
        </div>
      )}
    </div>
  );
}
