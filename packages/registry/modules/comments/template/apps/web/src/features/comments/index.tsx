import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface CommentItem {
  id: string;
  body: string;
  userId: string;
  postId: string;
  createdAt: number;
  updatedAt: number;
}

type CommentsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; comments: CommentItem[] };

const MAX_BODY_LENGTH = 5000;

export default function Comments() {
  const [state, setState] = useState<CommentsState>({ status: 'loading' });
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const load = () => {
    const controller = new AbortController();
    fetch('/api/comments', {
      signal: controller.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const comments = Array.isArray(data.comments) ? (data.comments as CommentItem[]) : [];
        setState(comments.length === 0 ? { status: 'empty' } : { status: 'ready', comments });
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'unknown error' });
      });
    return () => controller.abort();
  };

  useEffect(() => {
    const commentsCleanup = load();
    const authController = new AbortController();
    fetch('/api/auth/me', {
      signal: authController.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { setAuthUser(data?.user ?? null); setAuthLoading(false); })
      .catch(() => { setAuthUser(null); setAuthLoading(false); });
    return () => {
      commentsCleanup();
      authController.abort();
    };
  }, []);

  const isAuthenticated = !authLoading && authUser !== null;

  const createComment = async () => {
    if (!newBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody.trim(), postId: 'default' }),
        credentials: 'include',
      });
      if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return; }
      setNewBody('');
      load();
    } finally { setSubmitting(false); }
  };

  const updateComment = async (id: string) => {
    if (!editBody.trim()) return;
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody.trim() }),
        credentials: 'include',
      });
      if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return; }
      setEditingId(null);
      setEditBody('');
      load();
    } catch { /* ignore */ }
  };

  const deleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { setState({ status: 'error', message: `HTTP ${res.status}` }); return; }
      load();
    } catch { /* ignore */ }
  };

  /* ── Loading ── */
  if (state.status === 'loading') return <p>Loading comments…</p>;

  /* ── Error ── */
  if (state.status === 'error') return (
    <section aria-label="comments error" className="state-box">
      <h2>Something went wrong</h2>
      <p className="error-state" role="alert">{state.message}</p>
      <div className="state-box-actions">
        <a href="/comments" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); load(); }}>
          Try again
        </a>
        <Link to="/" className="btn btn-ghost">Back to Home</Link>
      </div>
    </section>
  );

  /* ── Page shell ── */
  return (
    <div>
      <section className="section-header">
        <h1>Comments</h1>
        <p>Read and share comments.</p>
      </section>

      {/* ── Composer (authenticated only) ── */}
      {isAuthenticated ? (
        <div className="comment-composer card">
          <label htmlFor="new-comment-body" className="sr-only">Write a comment</label>
          <textarea
            id="new-comment-body"
            className="form-input"
            placeholder="Write a comment…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            maxLength={MAX_BODY_LENGTH}
          />
          <div className="composer-actions">
            <span className="char-count">
              {newBody.length}/{MAX_BODY_LENGTH}
            </span>
            <button
              className="btn btn-primary"
              onClick={createComment}
              disabled={submitting || !newBody.trim()}
            >
              {submitting ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Anonymous auth prompt ── */
        <div className="comments-auth-prompt">
          <p>Join the conversation</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
            Sign in to post a comment.
          </p>
          <div className="comments-auth-actions">
            <Link to="/sign-in" className="btn btn-primary">Sign in</Link>
            <Link to="/sign-up" className="btn btn-secondary btn-sm">Create account</Link>
          </div>
        </div>
      )}

      {/* ── Comment list ── */}
      {state.status === 'empty' ? (
        <section aria-label="comments empty">
          <ul className="comment-list" aria-label="comments list">
            <li className="comment-item" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                No comments yet.
                {!isAuthenticated && ' Sign in to start the conversation.'}
              </p>
            </li>
          </ul>
        </section>
      ) : (
        <ul className="comment-list" aria-label="comments list">
          {state.comments.map((c) => (
            <li key={c.id} className="comment-item">
              {editingId === c.id ? (
                <div className="comment-edit">
                  <label htmlFor={`edit-body-${c.id}`} className="sr-only">Edit comment</label>
                  <textarea
                    id={`edit-body-${c.id}`}
                    className="form-input"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    maxLength={MAX_BODY_LENGTH}
                  />
                  <div className="edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => updateComment(c.id)}>
                      Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(null); setEditBody(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="comment-body">{c.body}</p>
                  {isAuthenticated && (
                    <div className="comment-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                      >
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteComment(c.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
