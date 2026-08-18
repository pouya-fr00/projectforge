# Module Catalog

## Available Modules

### `database-d1`

Cloudflare D1 database with Drizzle ORM, typed query helpers, local SQLite migration runner, and health check endpoint.

| Property | Value |
|----------|-------|
| Requirements | None |
| Packages added | `drizzle-orm` |
| Environment keys | `DATABASE_URL` |
| Migrations | `0001_db_init.sql` |
| Route | `/database` (API) |

**What it adds:** Database binding, typed client, migration runner, health endpoint.

**Install:**

```bash
projectforge add database-d1
```

---

### `auth`

Email/password authentication powered by Better Auth with D1/Drizzle storage, session management, and CORS/CSRF protection.

| Property | Value |
|----------|-------|
| Requirements | `database-d1` |
| Packages added | `better-auth`, `drizzle-orm` |
| Environment keys | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| Migrations | None (Better Auth manages its own schema) |
| Route | `/api/auth` (API) |

**What it adds:** Registration, login, logout, session management, `/me` endpoint, cookie-based sessions, CORS/CSRF middleware.

**Install:**

```bash
projectforge add auth
```

**Security notes:**

- `BETTER_AUTH_SECRET` must be a strong random string in production.
- `BETTER_AUTH_URL` must match your deployment origin.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Never log or expose the auth secret.

---

### `rbac`

Role-based access control backed by D1 and enforced via the Better Auth session. Includes roles, permissions, admin guard middleware, and seed data.

| Property | Value |
|----------|-------|
| Requirements | `auth` |
| Packages added | `better-auth`, `drizzle-orm` |
| Environment keys | None |
| Migrations | `0003_rbac.sql` |
| Route | `/admin` (API) |

**What it adds:** Role and permission models, server-side authorization middleware, admin guard, seed data, and route protection.

**Install:**

```bash
projectforge add rbac
```

**Security notes:**

- Authorization is enforced server-side. Never trust client-side role claims.
- Use the `requirePermission` middleware for protected routes.
- The admin guard checks both `user.role` and `user_role` table entries.

---

### `user-dashboard`

Protected user dashboard shell with account overview, profile/settings extension points, and responsive/RTL-ready layout.

| Property | Value |
|----------|-------|
| Requirements | `auth` |
| Packages added | `react-router-dom` |
| Environment keys | None |
| Migrations | None |
| Route | `/dashboard` (Web) |

**What it adds:** Dashboard page, auth session integration, loading/empty/error/unauthorized states.

**Install:**

```bash
projectforge add user-dashboard
```

---

### `admin-dashboard`

Protected admin dashboard shell with RBAC authorization boundary, user-list example, and responsive/RTL-ready layout.

| Property | Value |
|----------|-------|
| Requirements | `rbac` |
| Packages added | `react-router-dom` |
| Environment keys | None |
| Migrations | None |
| Route | `/admin` (Web) |

**What it adds:** Admin dashboard page, RBAC enforcement, user list, loading/error/unauthorized/forbidden/empty/ready states.

**Install:**

```bash
projectforge add admin-dashboard
```

**Security notes:**

- Access is controlled server-side by RBAC middleware.
- Normal users receive 403; unauthenticated users receive 401.
- Never trust client-side role claims for authorization.

---

### `comments`

Authenticated comment model with create/list/edit/delete-own, input validation, pagination, and tests.

| Property | Value |
|----------|-------|
| Requirements | `auth`, `database-d1` |
| Packages added | `react-router-dom`, `better-auth`, `drizzle-orm` |
| Environment keys | None |
| Migrations | `0002_comments_init.sql` |
| Routes | `/api/comments` (API), `/comments` (Web) |

**What it adds:** Comment API routes, web component with all states, ownership-based edit/delete, input validation, parameterized SQL queries.

**Install:**

```bash
projectforge add comments
```

**Security notes:**

- User identity is determined server-side from the auth session.
- Edit and delete operations verify comment ownership.
- All SQL is parameterized via D1 prepared statements.
- Input is validated for length, emptiness, and structure.
